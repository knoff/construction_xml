from app.services.schema_parser import extract_metadata


def test_extract_metadata_with_schema_version():
    xsd = b'''<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
                <xs:annotation>
                  <xs:documentation>Schema Sample</xs:documentation>
                </xs:annotation>
                <xs:element name="DesignAssignment" type="xs:string"/>
                <xs:attribute name="SchemaVersion" type="xs:string" use="required" fixed="01.03"/>
              </xs:schema>'''
    info = extract_metadata(xsd, filename="DesignAssignment-01-03.xsd")
    assert info.get("name") == "DesignAssignment"
    assert info.get("version") == "01.03"
    assert "Schema Sample" in info.get("description", "")


def test_extract_version_from_filename_only():
    xsd = b'''<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
                <xs:element name="Conclusion" type="xs:string"/>
              </xs:schema>'''
    info = extract_metadata(xsd, filename="ExpertConclusion-01-00.xsd")
    assert info.get("version") == "01.00"
    assert info.get("name") == "Conclusion"
