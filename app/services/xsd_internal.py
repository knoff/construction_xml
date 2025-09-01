from __future__ import annotations
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional, Tuple
from lxml import etree

XS = "http://www.w3.org/2001/XMLSchema"
NS = {"xs": XS}

# ---- Internal model data-classes (serialized to JSON) -----------------------

@dataclass
class Facets:
    enum: Optional[List[str]] = None
    # enriched items for UI: [{value, label?, help?}]
    enumOptions: Optional[List[Dict[str, str]]] = None
    pattern: Optional[str] = None
    minLength: Optional[int] = None
    maxLength: Optional[int] = None
    minInclusive: Optional[str] = None
    maxInclusive: Optional[str] = None
    minExclusive: Optional[str] = None
    maxExclusive: Optional[str] = None

@dataclass
class FieldDoc:
    label: Optional[str] = None
    help: Optional[str] = None

@dataclass
class FieldModel:
    # common
    kind: str                 # "element" | "attribute"
    name: str
    dtype: str                # xs:<builtin> | QName of named type | "object" for complex
    minOccurs: int = 1
    maxOccurs: Optional[int] = 1  # None => unbounded
    required: Optional[bool] = None  # for attributes (use="required")
    documentation: Optional[FieldDoc] = None
    facets: Optional[Facets] = None
    children: Optional[List["FieldModel"]] = None  # for complex/object
    attributes: Optional[List["FieldModel"]] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        # compact None values
        return {k: v for k, v in d.items() if v is not None}

@dataclass
class SchemaModel:
    root: List[FieldModel]
    types: Dict[str, Dict[str, Any]]  # registry of named simple/complex types

    def to_dict(self) -> Dict[str, Any]:
        return {
            "root": [f.to_dict() for f in self.root],
            "types": self.types,
        }

# ---- Parser ----------------------------------------------------------------

def _text(node: Optional[etree._Element]) -> Optional[str]:
    if node is None or (node.text or "").strip() == "":
        return None
    return " ".join(node.text.split())

def _first_doc(parent: etree._Element) -> Optional[FieldDoc]:
    ann = parent.find("./xs:annotation/xs:documentation", namespaces=NS)
    txt = _text(ann)
    if txt:
        # We map the first documentation to label, the same text can be used as help for MVP
        return FieldDoc(label=txt, help=txt)
    return None

def _facets_from_restriction(restr: etree._Element) -> Facets:
    f = Facets()
    enum_nodes = restr.findall("./xs:enumeration", namespaces=NS)
    enum_values: List[str] = []
    enum_opts: List[Dict[str, str]] = []
    for e in enum_nodes:
        val = e.get("value")
        if not val:
            continue
        enum_values.append(val)
        doc = _first_doc(e)  # look for xs:annotation/xs:documentation under enumeration
        if doc and (doc.label or doc.help):
            enum_opts.append({
                "value": val,
                **({"label": doc.label} if doc.label else {}),
                **({"help": doc.help} if doc.help else {}),
            })
        else:
            enum_opts.append({"value": val})
    if enum_values:
        f.enum = enum_values
        f.enumOptions = enum_opts
    pat = restr.find("./xs:pattern", namespaces=NS)
    if pat is not None and pat.get("value"):
        f.pattern = pat.get("value")
    for name in ("minLength","maxLength","minInclusive","maxInclusive","minExclusive","maxExclusive"):
        node = restr.find(f"./xs:{name}", namespaces=NS)
        if node is not None and node.get("value") is not None:
            v = node.get("value")
            setattr(f, name, int(v) if name.endswith("Length") else v)
    # drop empty dataclass -> None
    if asdict(f) == {
        "enum": None, "enumOptions": None, "pattern": None, "minLength": None, "maxLength": None,
        "minInclusive": None, "maxInclusive": None, "minExclusive": None, "maxExclusive": None
    }:
        return Facets()  # will be pruned later
    return f

def _resolve_named_types(root: etree._Element) -> Dict[str, Dict[str, Any]]:
    types: Dict[str, Dict[str, Any]] = {}
    # simple types with restrictions
    for st in root.findall(".//xs:simpleType", namespaces=NS):
        name = st.get("name")
        if not name:
            continue
        base = None
        restr = st.find("./xs:restriction", namespaces=NS)
        if restr is not None:
            base = restr.get("base")
        types[name] = {
            "kind": "simpleType",
            "base": base,
            "facets": asdict(_facets_from_restriction(restr)) if restr is not None else None,
            "documentation": asdict(_first_doc(st)) if _first_doc(st) else None,
        }
    # complex types (structure + attributes)
    for ct in root.findall(".//xs:complexType", namespaces=NS):
        name = ct.get("name")
        if not name:
            continue
        model = _parse_complex_type(ct)
        types[name] = {
            "kind": "complexType",
            **model,  # children/attributes/documentation
        }
    return types

def _parse_complex_type(ct: etree._Element) -> Dict[str, Any]:
    # Handle sequence/choice/all and attributes
    documentation = _first_doc(ct)
    children: List[FieldModel] = []
    # Content model (sequence | choice | all)
    for tag in ("sequence", "choice", "all"):
        group = ct.find(f"./xs:{tag}", namespaces=NS)
        if group is not None:
            for el in group.findall("./xs:element", namespaces=NS):
                children.append(_parse_element(el))
            break
    # attributes (xs:attribute)
    attrs: List[FieldModel] = []
    for a in ct.findall("./xs:attribute", namespaces=NS):
        attrs.append(_parse_attribute(a))
    result: Dict[str, Any] = {}
    if children:
        result["children"] = [c.to_dict() for c in children]
    if attrs:
        result["attributes"] = [a.to_dict() for a in attrs]
    if documentation:
        result["documentation"] = asdict(documentation)
    return result

def _occurs(node: etree._Element) -> Tuple[int, Optional[int]]:
    mi = node.get("minOccurs")
    ma = node.get("maxOccurs")
    minOccurs = int(mi) if mi is not None else 1
    if ma == "unbounded":
        return minOccurs, None
    maxOccurs = int(ma) if ma is not None else 1
    return minOccurs, maxOccurs

def _parse_attribute(a: etree._Element) -> FieldModel:
    name = a.get("name") or ""
    dtype = a.get("type") or "xs:string"
    required = (a.get("use") == "required")
    doc = _first_doc(a)
    # local simpleType restriction
    facets = None
    st = a.find("./xs:simpleType/xs:restriction", namespaces=NS)
    if st is not None:
        facets = _facets_from_restriction(st)
    fm = FieldModel(
        kind="attribute",
        name=name,
        dtype=dtype,
        required=required,
        documentation=doc,
        facets=facets,
    )
    return fm

def _parse_element(el: etree._Element) -> FieldModel:
    name = el.get("name") or ""
    dtype = el.get("type")
    minOccurs, maxOccurs = _occurs(el)
    documentation = _first_doc(el)

    # inline simpleType restriction
    st = el.find("./xs:simpleType/xs:restriction", namespaces=NS)
    if st is not None:
        facets = _facets_from_restriction(st)
        base = st.get("base") or "xs:string"
        return FieldModel(
            kind="element",
            name=name,
            dtype=base,
            minOccurs=minOccurs,
            maxOccurs=maxOccurs if maxOccurs != 1 else 1,
            documentation=documentation,
            facets=facets,
        )

    # inline complexType (nested structure)
    ct = el.find("./xs:complexType", namespaces=NS)
    if ct is not None:
        complex_model = _parse_complex_type(ct)
        fm = FieldModel(
            kind="element",
            name=name,
            dtype="object",
            minOccurs=minOccurs,
            maxOccurs=maxOccurs if maxOccurs != 1 else 1,
            documentation=documentation,
            children=[
                FieldModel(**child) if isinstance(child, dict) else child
                for child in complex_model.get("children", [])
            ] if complex_model.get("children") else None,
            attributes=[
                FieldModel(**attr) if isinstance(attr, dict) else attr
                for attr in complex_model.get("attributes", [])
            ] if complex_model.get("attributes") else None,
        )
        return fm

    # plain reference to named type (simple or complex)
    return FieldModel(
        kind="element",
        name=name,
        dtype=dtype or "xs:string",
        minOccurs=minOccurs,
        maxOccurs=maxOccurs if maxOccurs != 1 else 1,
        documentation=documentation,
    )

def build_internal_model(content: bytes) -> Dict[str, Any]:
    """Parse XSD content and return internal JSON model."""
    parser = etree.XMLParser(recover=True, resolve_entities=False, huge_tree=True)
    root = etree.fromstring(content, parser=parser)

    # registry of named types
    types = _resolve_named_types(root)

    # root elements (top-level xs:element)
    roots: List[FieldModel] = []
    for el in root.findall("./xs:element", namespaces=NS):
        roots.append(_parse_element(el))

    # prune empty facets in named types
    for name, t in list(types.items()):
        if t.get("facets") == asdict(Facets()):
            t["facets"] = None

    model = SchemaModel(root=roots, types=types)
    return model.to_dict()
