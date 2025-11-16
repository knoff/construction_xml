from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional, Tuple

from lxml import etree

XS = "http://www.w3.org/2001/XMLSchema"
NS = {"xs": XS}
_TYPES_REGISTRY: Dict[str, Dict[str, Any]] = {}
_ROOT_NODE: Optional[etree._Element] = None


@dataclass
class Facets:
    enum: Optional[List[str]] = None
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
    kind: str
    name: str
    dtype: str
    refType: Optional[str] = None
    minOccurs: int = 1
    maxOccurs: Optional[int] = 1
    required: Optional[bool] = None
    documentation: Optional[FieldDoc] = None
    facets: Optional[Facets] = None
    children: Optional[List["FieldModel"]] = None
    attributes: Optional[List["FieldModel"]] = None

    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        result: Dict[str, Any] = {}
        for key, value in data.items():
            if key == "maxOccurs":
                result[key] = value
            elif value is not None:
                result[key] = value
        return result


@dataclass
class SchemaModel:
    root: List[FieldModel]
    types: Dict[str, Dict[str, Any]]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "root": [field.to_dict() for field in self.root],
            "types": self.types,
        }


def build_internal_model(content: bytes) -> Dict[str, Any]:
    parser = etree.XMLParser(recover=True, resolve_entities=False, huge_tree=True)
    root = etree.fromstring(content, parser=parser)

    global _ROOT_NODE, _TYPES_REGISTRY
    _ROOT_NODE = root
    _TYPES_REGISTRY = _resolve_named_types(root)

    root_fields: List[FieldModel] = []
    for element in root.findall("./xs:element", namespaces=NS):
        root_fields.append(_parse_element(element))

    model = SchemaModel(root=root_fields, types=_TYPES_REGISTRY)
    return model.to_dict()


def _text(node: Optional[etree._Element]) -> Optional[str]:
    if node is None or not (node.text or "").strip():
        return None
    return " ".join(node.text.split())


def _first_doc(parent: etree._Element) -> Optional[FieldDoc]:
    doc = parent.find("./xs:annotation/xs:documentation", namespaces=NS)
    text = _text(doc)
    if text:
        return FieldDoc(label=text, help=text)
    return None


def _facets_from_restriction(restriction: etree._Element) -> Facets:
    facets = Facets()
    enum_nodes = restriction.findall("./xs:enumeration", namespaces=NS)
    enum_values: List[str] = []
    enum_options: List[Dict[str, str]] = []
    for node in enum_nodes:
        value = node.get("value")
        if not value:
            continue
        enum_values.append(value)
        doc = _first_doc(node)
        option: Dict[str, str] = {"value": value}
        if doc and doc.label:
            option["label"] = doc.label
        if doc and doc.help:
            option["help"] = doc.help
        enum_options.append(option)
    if enum_values:
        facets.enum = enum_values
        facets.enumOptions = enum_options
    pattern = restriction.find("./xs:pattern", namespaces=NS)
    if pattern is not None and pattern.get("value"):
        facets.pattern = pattern.get("value")
    for name in ("minLength", "maxLength", "minInclusive", "maxInclusive", "minExclusive", "maxExclusive"):
        node = restriction.find(f"./xs:{name}", namespaces=NS)
        if node is not None and node.get("value") is not None:
            value = node.get("value")
            setattr(facets, name, int(value) if name.endswith("Length") else value)
    if all(getattr(facets, field) is None for field in facets.__dataclass_fields__):
        return Facets()
    return facets


def _resolve_named_types(root: etree._Element) -> Dict[str, Dict[str, Any]]:
    types: Dict[str, Dict[str, Any]] = {}
    for simple_type in root.findall(".//xs:simpleType", namespaces=NS):
        name = simple_type.get("name")
        if not name:
            continue
        base = None
        restriction = simple_type.find("./xs:restriction", namespaces=NS)
        if restriction is not None:
            base = restriction.get("base")
        types[name] = {
            "kind": "simpleType",
            "base": base,
            "facets": asdict(_facets_from_restriction(restriction)) if restriction is not None else None,
            "documentation": asdict(_first_doc(simple_type)) if _first_doc(simple_type) else None,
        }
    for complex_type in root.findall(".//xs:complexType", namespaces=NS):
        name = complex_type.get("name")
        if not name:
            continue
        model = _parse_complex_type(complex_type)
        types[name] = {"kind": "complexType", **model}
    return types


def _parse_complex_type(ct: etree._Element) -> Dict[str, Any]:
    documentation = _first_doc(ct)
    children: List[FieldModel] = []
    group = None
    complex_content = ct.find("./xs:complexContent", namespaces=NS)
    if complex_content is not None:
        extension = complex_content.find("./xs:extension", namespaces=NS)
        if extension is not None:
            for tag in ("sequence", "choice", "all", "group"):
                group = extension.find(f"./xs:{tag}", namespaces=NS)
                if group is not None:
                    break
    if group is None:
        for tag in ("sequence", "choice", "all", "group"):
            group = ct.find(f"./xs:{tag}", namespaces=NS)
            if group is not None:
                break
    if group is not None:
        children.extend(_parse_model_group(group))

    attributes: List[FieldModel] = []
    for attribute in ct.findall("./xs:attribute", namespaces=NS):
        attributes.append(_parse_attribute(attribute))

    result: Dict[str, Any] = {}
    if children:
        result["children"] = [child.to_dict() for child in children]
    if attributes:
        result["attributes"] = [attribute.to_dict() for attribute in attributes]
    if documentation:
        result["documentation"] = asdict(documentation)
    return result


def _parse_model_group(group: etree._Element) -> List[FieldModel]:
    result: List[FieldModel] = []
    tag_local = group.tag.split("}")[-1] if isinstance(group.tag, str) else ""

    if tag_local == "group":
        ref = group.get("ref")
        if ref and _ROOT_NODE is not None:
            min_occurs, max_occurs = _occurs(group)
            ref_name = ref.split(":")[-1]
            group_def = _ROOT_NODE.find(f".//xs:group[@name='{ref_name}']", namespaces=NS)
            if group_def is not None:
                for tag in ("sequence", "choice", "all"):
                    inner = group_def.find(f"./xs:{tag}", namespaces=NS)
                    if inner is not None:
                        inner_models = _parse_model_group(inner)
                        if len(inner_models) == 1 and inner_models[0].kind == "choice":
                            inner_models[0].minOccurs = min_occurs
                            inner_models[0].maxOccurs = max_occurs
                        result.extend(inner_models)
                        return result
        return result

    if tag_local == "choice":
        parent = group.getparent()
        siblings = list(parent) if parent is not None else []
        seen = sum(1 for node in siblings if isinstance(node.tag, str) and node.tag.split("}")[-1] == "choice" and node is not group)
        choice_idx = seen + 1
        choice_name = f"__choice__#{choice_idx:02d}"
        min_occurs, max_occurs = _occurs(group)
        alternatives: List[FieldModel] = []
        for node in list(group):
            if not isinstance(node.tag, str):
                continue
            local_tag = node.tag.split("}")[-1]
            if local_tag == "element":
                alternatives.append(_parse_element(node))
            elif local_tag == "sequence":
                seq_children: List[FieldModel] = []
                for seq_node in list(node):
                    if not isinstance(seq_node.tag, str):
                        continue
                    seq_local = seq_node.tag.split("}")[-1]
                    if seq_local == "element":
                        seq_children.append(_parse_element(seq_node))
                    elif seq_local in ("sequence", "choice", "all", "group"):
                        seq_children.extend(_parse_model_group(seq_node))
                alternatives.append(
                    FieldModel(
                        kind="sequence",
                        name="__sequence__",
                        dtype="object",
                        minOccurs=1,
                        maxOccurs=1,
                        documentation=_first_doc(node),
                        children=seq_children or None,
                    )
                )
            elif local_tag in ("all", "group"):
                seq_children = _parse_model_group(node)
                alternatives.append(
                    FieldModel(
                        kind="sequence",
                        name="__sequence__",
                        dtype="object",
                        minOccurs=1,
                        maxOccurs=1,
                        documentation=_first_doc(node),
                        children=seq_children or None,
                    )
                )
        result.append(
            FieldModel(
                kind="choice",
                name=choice_name,
                dtype="object",
                minOccurs=min_occurs,
                maxOccurs=max_occurs,
                documentation=_first_doc(group),
                children=alternatives,
            )
        )
        return result

    for node in list(group):
        if not isinstance(node.tag, str):
            continue
        local_tag = node.tag.split("}")[-1]
        if local_tag == "element":
            result.append(_parse_element(node))
        elif local_tag in ("sequence", "choice", "all", "group"):
            result.extend(_parse_model_group(node))
    return result


def _occurs(node: etree._Element) -> Tuple[int, Optional[int]]:
    min_value = node.get("minOccurs")
    max_value = node.get("maxOccurs")
    min_occurs = int(min_value) if min_value is not None else 1
    if max_value == "unbounded":
        return min_occurs, None
    max_occurs = int(max_value) if max_value is not None else 1
    return min_occurs, max_occurs


def _parse_attribute(node: etree._Element) -> FieldModel:
    name = node.get("name") or ""
    dtype = node.get("type") or "xs:string"
    required = node.get("use") == "required"
    documentation = _first_doc(node)
    facets = None
    restriction = node.find("./xs:simpleType/xs:restriction", namespaces=NS)
    if restriction is not None:
        facets = _facets_from_restriction(restriction)
    return FieldModel(
        kind="attribute",
        name=name,
        dtype=dtype,
        required=required,
        documentation=documentation,
        facets=facets,
    )


def _parse_element(node: etree._Element) -> FieldModel:
    name = node.get("name") or ""
    dtype = node.get("type")
    min_occurs, max_occurs = _occurs(node)
    documentation = _first_doc(node)

    restriction = node.find("./xs:simpleType/xs:restriction", namespaces=NS)
    if restriction is not None:
        facets = _facets_from_restriction(restriction)
        base = restriction.get("base") or "xs:string"
        return FieldModel(
            kind="element",
            name=name,
            dtype=base,
            minOccurs=min_occurs,
            maxOccurs=max_occurs if max_occurs != 1 else 1,
            documentation=documentation,
            facets=facets,
        )

    complex_type = node.find("./xs:complexType", namespaces=NS)
    if complex_type is not None:
        complex_model = _parse_complex_type(complex_type)
        return FieldModel(
            kind="element",
            name=name,
            dtype="object",
            minOccurs=min_occurs,
            maxOccurs=max_occurs if max_occurs != 1 else 1,
            documentation=documentation,
            children=[FieldModel(**child) if isinstance(child, dict) else child for child in complex_model.get("children", [])] if complex_model.get("children") else None,
            attributes=[FieldModel(**attr) if isinstance(attr, dict) else attr for attr in complex_model.get("attributes", [])] if complex_model.get("attributes") else None,
        )

    if dtype and dtype in _TYPES_REGISTRY:
        type_def = _TYPES_REGISTRY[dtype]
        if type_def.get("kind") == "simpleType":
            base = type_def.get("base") or "xs:string"
            return FieldModel(
                kind="element",
                name=name,
                dtype=base,
                refType=dtype,
                minOccurs=min_occurs,
                maxOccurs=max_occurs if max_occurs != 1 else 1,
                documentation=documentation,
                facets=Facets(**type_def["facets"]) if type_def.get("facets") else None,
            )
        return FieldModel(
            kind="element",
            name=name,
            dtype="object",
            refType=dtype,
            minOccurs=min_occurs,
            maxOccurs=max_occurs if max_occurs != 1 else 1,
            documentation=documentation,
        )

    return FieldModel(
        kind="element",
        name=name,
        dtype="xs:string",
        minOccurs=min_occurs,
        maxOccurs=max_occurs if max_occurs != 1 else 1,
        documentation=documentation,
    )
