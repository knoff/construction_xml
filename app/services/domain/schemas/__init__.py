from .internal import build_internal_model
from .classifier import classify
from .xsd_parser import extract_metadata
from .xsd_files import build_file_bindings, detect_file_hints

__all__ = [
    "build_internal_model",
    "classify",
    "extract_metadata",
    "build_file_bindings",
    "detect_file_hints",
]
