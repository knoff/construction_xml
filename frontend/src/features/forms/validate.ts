// БАЗОВАЯ валидация internal-model -> state
import type { FieldModel, SchemaModel } from "./types";

// simple dtype helpers
function isEmpty(v: any) {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
}
function inputKind(dtype: string) {
  if (/^xs?:date$/.test(dtype)) return "date";
  if (/^(xs?:)?(integer|decimal|float|double|number)$/.test(dtype)) return "number";
  return "text";
}
function pathKey(path:(string|number)[]) { return path.map(String).join("."); }

export type ValidationErrors = Record<string, string[]>;

export function validateModel(opts:{
  state:any,
  fields: FieldModel[],
  types: Record<string, any>,
}): ValidationErrors {
  const { state, fields, types } = opts;
  const errors: ValidationErrors = {};

  const pushErr = (p:(string|number)[], msg:string) => {
    const k = pathKey(p);
    (errors[k] ||= []).push(msg);
  };

  const resolve = (f: FieldModel): FieldModel => {
    if (f?.refType && types?.[f.refType]?.kind === "complexType") {
      const t = types[f.refType];
      return {
        ...f,
        documentation: f.documentation ?? t.documentation,
        children: f.children ?? t.children,
        attributes: f.attributes ?? t.attributes,
      };
    }
    return f;
  };

  // count multiplicity helper
  const occurs = (v:any): number => Array.isArray(v) ? v.length : (v == null ? 0 : 1);

  const visit = (f0: FieldModel, p:(string|number)[], val:any) => {
    const f = resolve(f0);
    const min = f.minOccurs ?? 1;
    const max = f.maxOccurs === null ? Infinity : (f.maxOccurs ?? 1);

    // choice
    if (f.kind === "choice") {
      if (max > 1 || f.maxOccurs === null) {
        const count = occurs(val);
        if (count < (min ?? 0)) pushErr(p, `Нужно минимум ${min} элемент(ов).`);
        if (count > max) pushErr(p, `Допустимо максимум ${max === Infinity ? "∞" : max}.`);
        if (Array.isArray(val)) {
          val.forEach((item, idx) => {
            if (item && typeof item === "object") {
              const name = Object.keys(item)[0];
              const child = (f.children ?? []).find(c => c.name === name);
              if (child) visit(child, [...p, idx, name], item[name]);
            }
          });
        }
      } else {
        // single choice
        if (!val || typeof val !== "object") {
          if ((min ?? 1) >= 1) pushErr(p, "Выберите один из вариантов.");
          return;
        }
        const name = Object.keys(val)[0];
        const child = (f.children ?? []).find(c => c.name === name);
        if (!child) { pushErr(p, "Некорректный выбор варианта."); return; }
        visit(child, [...p, name], val[name]);
      }
      return;
    }

    // attribute/simple
    if (f.kind === "attribute" || (f.dtype !== "object" && !f.children && !f.attributes)) {
      if (max > 1 || f.maxOccurs === null) {
        const count = occurs(val);
        if (count < (min ?? 0)) pushErr(p, `Нужно минимум ${min} значений.`);
        if (count > max) pushErr(p, `Допустимо максимум ${max === Infinity ? "∞" : max}.`);
        if (Array.isArray(val)) {
          val.forEach((v,i) => validateScalar(f, [...p,i], v));
        }
      } else {
        // single scalar
        if ((f.kind === "attribute" && f.required) || (min ?? 1) >= 1) {
          if (isEmpty(val)) pushErr(p, "Обязательное поле.");
        }
        if (!isEmpty(val)) validateScalar(f, p, val);
      }
      return;
    }

    // complex/object
    if (max > 1 || f.maxOccurs === null) {
      const count = occurs(val);
      if (count < (min ?? 0)) pushErr(p, `Нужно минимум ${min} элемент(ов).`);
      if (count > max) pushErr(p, `Допустимо максимум ${max === Infinity ? "∞" : max}.`);
      if (Array.isArray(val)) {
        val.forEach((item,i) => visitComplexChildren(f, [...p,i], item));
      }
    } else {
      if ((min ?? 1) >= 1 && (val == null)) pushErr(p, "Обязательный раздел.");
      if (val != null) visitComplexChildren(f, p, val);
    }
  };

  const validateScalar = (f: FieldModel, p:(string|number)[], v:any) => {
    const kind = inputKind(f.dtype);
    if (kind === "number") {
      if (v !== "" && isNaN(Number(v))) pushErr(p, "Число: неверный формат.");
    }
    if (f.facets?.pattern) {
      const re = new RegExp(f.facets.pattern);
      if (!re.test(String(v ?? ""))) pushErr(p, "Не соответствует шаблону.");
    }
    if (typeof v === "string") {
      if (f.facets?.minLength != null && v.length < f.facets.minLength) pushErr(p, `Минимальная длина ${f.facets.minLength}.`);
      if (f.facets?.maxLength != null && v.length > f.facets.maxLength) pushErr(p, `Максимальная длина ${f.facets.maxLength}.`);
    }
    if (f.facets?.enum && f.facets.enum.length > 0) {
      if (!f.facets.enum.includes(String(v))) pushErr(p, "Недопустимое значение.");
    }
  };

  const visitComplexChildren = (f: FieldModel, p:(string|number)[], v:any) => {
    // attributes
    (f.attributes ?? []).forEach(a => {
      const av = v?.[`@${a.name}`];
      visit(a, [...p, `@${a.name}`], av);
    });
    // elements
    (f.children ?? []).forEach(ch => {
      const cv = v?.[ch.name];
      visit(ch, [...p, ch.name], cv);
    });
  };

  fields.forEach(f => visit(f, [f.name], state?.[f.name]));
  return errors;
}
