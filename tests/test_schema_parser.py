from app.services.schema_parser import extract_metadata

def test_extract_metadata_minimal():
    xsd = b'''<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                         targetNamespace="http://example.org"
                         version="1.2">
                <xs:annotation><xs:documentation>Demo</xs:documentation></xs:annotation>
                <xs:element name="DesignAssignment" type="xs:string"/>
              </xs:schema>'''
    info = extract_metadata(xsd)
    assert info["namespace"] == "http://example.org"
    assert info["version"] == "1.2"
    assert "Demo" in info.get("description", "")
    assert info["name"] == "DesignAssignment"
