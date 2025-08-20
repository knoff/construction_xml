<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="html" omit-xml-declaration="yes"/>

    <!-- 
        Таблица стилей визуализаци заключения экспертизы, подготовленного в формате xml
        
        Версия используемой xml-схемы заключения экспертизы: 01.00
		
		20-01-2022 - 1) Добавлена возможность описания валюты сметной стоимости
					 2) Исправлена таблица по сумма в текущих ценах (добавлено вывод "без НДС")
					 3) Исправлен заголовок пункта 5 в зависимости от вида экспертизы (певичная, повторная, в форме экспертного сопровождения)
					 4) Исправлен вывод заголовка по выводам для вида работ "Сохранение объекта культурного наследия" 
					 5) Убран стиль Заголовка у " Информация об использованных сметных нормативах"
					 
		28-01-2022 - 1) Исправлена опечатка в пункте 3.2. для Экспертного сопровождения в части "ПД+ПДОСС" (строка 1549)
		
		08.02.2022 - 1) Если указана доля финансирования как 0 (ноль), то при визуализации ставится прочерк (доля неизвестна)
		
		18.02.2022 - 1) Откюлечен вывод таблицы ТЭП в случае их отсутсвия
		
		12.04.2022 - 1) Дополнительные сведения о виде экспертизы визуализируются после пункта 1.5. для всех видов экспертизы.
		
		14.04.2022 - 1) Исправлена нумерация при ПД выводов о несоответствии ($ExType = 'ПДОСС' or $ExType = 'ПД+ПДОСС' or $ExType = 'ПД')
					 2) Вывод об отсутствии ДПТ для линейных объектов изменена
		
		24.10.2022	 1) Исправлен заголовок "2.6. Сведения об использовании при подготовке проектной документации типовой проектной документации"
					 2) Исправлено наименование 5 раздела 
					 
		11.11.2022   1) Исправлена ошибка визуализауии источников финансирования Бюджет государственного внебюджетного фонда Российской Федерации и Бюджет территориального государственного внебюджетного фонда
		
		16.01.2022   1) Исправлена ошибка вывода заголовка "Замечания в части соответствия расчетов, содержащихся в сметной документации, физическим объемам работ, конструктивным, организационно-технологическим и другим решениям, предусмотренным проектной документацией"
		             2) Реализован алгоритм вывод пунктов 4.1.2. (о методах РИИ), 4.1.3., 4.1.4. в случае первочной или повторной экспертизы (РИИ)
					 
		02.03.2023   1) Удалено упоминание о приказ №374 - отсылка идет к наименованию классификатора
		
		23.03.2023   1) Изменен вывод направлений деятельности в связи с изменением справочника
		             2) Добавлен вывод наименований новых субъектов РФ в связи с изменением справочника
		             3) Изменен вывод о типовой проектной документации (возможно указание нескольких заключений)
		             4) Добавлен вывод информации о расчетном значении сейсмической активности
		             5) Добавлены выводы пунктов об использовании технологий ИМ
		             
		14.06.2023   1) Изменен вывод перечня сметных документов в составе проектной документации в связи с изменением кодов 
		             2) Изменен вывод информации об аварийных решениях (в положительном заключении после списка проектной документации, в отрицательном после списка замечаний)
		             
		01.09.2024   1) Внесены изменения в процесс визуализации выводов (в том числе общий вывод)
		             2) Добавлена визуализация выводв сведений о необходимости проведения экологической экспертизы и комментарий к ним
		             3) Внесены изменения в процесс визуализации элемента tPreviousSimpleConclusions, а также заголовка раздела, содержащий указанный элемент  
		             4) Внесены изменения в процесс визуализации элемента tDocument для визуализации ИУЛа(ИУЛов)
		             5) Внесены изменения в порядок вывода разделов проектной документации в члучае присутсвия одновременно документов с кодами 07.хх и 08.хх
-->

    <xsl:template match="/">

        <xsl:apply-templates select="Conclusion"/>

    </xsl:template>

    <xsl:template match="Conclusion">
        <!-- Начало основного шаблона -->

        <html>
            <head>
                <style type="text/css">
                    h1 {
                        font-family: Times New Roman;
                        font-size: 20pt;
                        font-weight: bold;
                        text-align: center;
                        width: 100%;
                        margin-top: 0;
                    }
                    p {
                        font-family: Times New Roman;
                        font-size: 14pt;
                        margin-bottom: 5px;
                        text-indent: 30px;
                        margin-top: 0;
                        text-align: justify;
                    }
                    body {
                        font-family: Times New Roman;
                        font-size: 14pt;
                        margin: 0;
                    }
                    
                    .title {
                        font-size: 16pt;
                        font-weight: bold;
                        text-align: center;
                        text-indent: 0px;
                        margin-bottom: 5px;
                    }
                    .no-first-line {
                        text-indent: 0px;
                    }
                    .field {
                        font-weight: bold;
                    }
                    .center {
                        text-align: center;
                        text-indent: 0px;
                    }
                    .right {
                        text-align: right;
                    }
                    .left {
                        text-align: left;
                    }
                    .organization {
                        text-align: left;
                        text-indent: 0px;
                    }
                    .expert {
                        text-align: left;
                        text-indent: 0px;
                        font-size: 12pt;
                    }
                    .title_org_name {
                        font-size: 20pt;
                        text-align: center;
                        font-weight: bold;
                    }
                    .title_org_data {
                        font-size: 14pt;
                        text-align: center;
                    }
                    .pagebreak {
                        page-break-before: always;
                    }
                    
                    table {
                        border-collapse: collapse;
                        width: 100%;
                        margin: 2em 0;
                        font-family: Times New Roman;
                        font-size: 12pt;
                    }
                    td {
                        border: 1px solid black;
                        padding: 0.2em 0.5em;
                        vertical-align: top;
                        font-family: Times New Roman;
                        font-size: 11pt;
                    }
                    td.main {
                        border: 0px;
                        padding: 0.2em 0.5em;
                        vertical-align: top;
                    }
                    td.number {
                        border: 1px solid black;
                        font-family: Times New Roman;
                        font-size: 18pt;
                        text-align: center;
                    }
                    .longline_break
                    {
                        word-wrap: break-word;
                        word-break: break-all;
                    }</style>
            </head>
            <title>Заключение экспертизы</title>
            <body>

                <div align="center" style="width: 800px; position: relative; left: 50%; margin-left: -400px;">

                    <xsl:variable name="ExType">
                        <xsl:choose>
                            <xsl:when test="ExaminationObject[ExaminationType = 1] and not(ExaminationObject[ExaminationType = 2]) and not(ExaminationObject[ExaminationType = 3])">РИИ</xsl:when>
                            <xsl:when test="not(ExaminationObject[ExaminationType = 1]) and ExaminationObject[ExaminationType = 2] and not(ExaminationObject[ExaminationType = 3])">ПД</xsl:when>
                            <xsl:when test="ExaminationObject[ExaminationType = 1] and ExaminationObject[ExaminationType = 2] and not(ExaminationObject[ExaminationType = 3])">РИИ+ПД</xsl:when>
                            <xsl:when test="not(ExaminationObject[ExaminationType = 1]) and not(ExaminationObject[ExaminationType = 2]) and ExaminationObject[ExaminationType = 3]">ПДОСС</xsl:when>
                            <xsl:when test="not(ExaminationObject[ExaminationType = 1]) and ExaminationObject[ExaminationType = 2] and ExaminationObject[ExaminationType = 3]">ПД+ПДОСС</xsl:when>
                            <xsl:when test="ExaminationObject[ExaminationType = 1] and ExaminationObject[ExaminationType = 2] and ExaminationObject[ExaminationType = 3]">РИИ+ПД+ПДОСС</xsl:when>
                        </xsl:choose>
                    </xsl:variable>

                    <xsl:variable name="SummaryType">
                        <xsl:choose>
                            <!-- Если ПДОСС повторный и вид работ капремон или сохранение и есть ранее выданное положительное заключение по ПД -->
                            <xsl:when test="ExaminationObject/ConstructionType = 5 and ExaminationObject/ExaminationStage = 2 and $ExType = 'ПДОСС' and PreviousConclusions/PreviousConclusion[ExaminationObjectType != 1 and Result = 1]">2</xsl:when>
                            <!-- Если ПДОСС и вид работ капремон или сохранение -->
                            <xsl:when test="ExaminationObject/ConstructionType = 5 and $ExType = 'ПДОСС'">2</xsl:when>
                            <!-- Если вид работ капремон -->
                            <xsl:when test="ExaminationObject/ConstructionType = 3">2</xsl:when>
                            <xsl:otherwise>1</xsl:otherwise>
                        </xsl:choose>
                    </xsl:variable>

                    <!-- Начало титульного листа -->

                    <!-- Вывод шапки с данными экспертной организации -->
                    <hr/>
                    <br/>
                    <br/>
                    <p class="title_org_name">
                        <xsl:if test="contains(ExpertOrganization/OrgFullName, '&quot;')">
                            <xsl:value-of select="substring-before(ExpertOrganization/OrgFullName, '&quot;')"/>
                            <br/> &quot;<xsl:value-of select="substring-after(ExpertOrganization/OrgFullName, '&quot;')"/>
                        </xsl:if>
                        <xsl:if test="not(contains(ExpertOrganization/OrgFullName, '&quot;'))">
                            <xsl:value-of select="ExpertOrganization/OrgFullName"/>
                        </xsl:if>
                    </p>
                    <br/>
                    <br/>

                    <!-- Вывод ведений о лице, утвердившем заключение экспертизы, и даты утверждения -->
                    <p class="right">"УТВЕРЖДАЮ"<br/>
                        <xsl:value-of select="Approver/Position"/><br/>
                        <xsl:value-of select="Approver/FamilyName"/><xsl:text> </xsl:text>
                        <xsl:value-of select="Approver/FirstName"/><xsl:text> </xsl:text>
                        <xsl:value-of select="Approver/SecondName"/><br/>
                    </p>
                    <br/>
                    <br/>

                    <!-- Вывод заголовка заключения экспертизы с учетом результата, формы и стадии экспертизы -->
                    <h1>
                        <xsl:call-template name="MakeTitle">
                            <xsl:with-param name="Result" select="ExaminationObject/ExaminationResult"/>
                            <xsl:with-param name="Form" select="ExaminationObject/ExaminationForm"/>
                            <xsl:with-param name="Stage" select="ExaminationObject/ExaminationStage"/>
                        </xsl:call-template>
                    </h1>
                    <br/>
                    <br/>

                    <!-- Вывод наименования объекта экспертизы -->
                    <p class="title">Наименование объекта экспертизы:</p>
                    <p class="center">
                        <xsl:value-of select="ExaminationObject/Name"/>
                    </p>
                    <br/>

                    <!-- Вывод сведений о виде работ  -->
                    <p class="title">Вид работ:</p>
                    <p class="center">
                        <xsl:call-template name="MakeWorkType">
                            <xsl:with-param name="Code" select="ExaminationObject/ConstructionType"/>
                        </xsl:call-template>
                    </p>
                    <br/>

                    <!-- Вывод сведений об объекте экспертизы -->
                    <p class="title">Объект экспертизы:</p>
                    <p class="center">
                        <xsl:call-template name="MakeObjectType">
                            <xsl:with-param name="Code" select="ExaminationObject/ExaminationObjectType"/>
                        </xsl:call-template>
                    </p>
                    <br/>

                    <!-- Вывод сведений о предмете экспертизы -->
                    <p class="title">Предмет экспертизы:</p>
                    <p class="center">
                        <xsl:for-each select="ExaminationObject/ExaminationType">
                            <xsl:call-template name="MakeExaminationType">
                                <xsl:with-param name="Code" select="."/>
                            </xsl:call-template>
                            <xsl:if test="position() != last()">
                                <xsl:text>, </xsl:text>
                            </xsl:if>
                        </xsl:for-each>
                    </p>
                    <br/>
                    <br/>

                    <hr/>

                    <br/>
                    <br/>
                    <div class="pagebreak"> </div>
                    <!-- Конец титульного листа -->

                    <!-- Вывод заголовка первого раздела  -->
                    <p class="title">I. Общие положения и сведения о заключении экспертизы</p>
                    <br/>

                    <!-- Вывод cведений об экспертной организации -->
                    <p class="title">
                        <xsl:choose>
                            <xsl:when test="ExaminationObject/ExaminationStage = 1">1.1. Сведения об организации по проведению экспертизы</xsl:when>
                            <xsl:when test="ExaminationObject/ExaminationStage = 2">1.1. Сведения об организации по проведению повторной экспертизы</xsl:when>
                            <xsl:when test="ExaminationObject/ExaminationStage = 3">1.1. Сведения об организации по проведению оценки соответствия в рамках экспертного сопровождения</xsl:when>
                        </xsl:choose>
                    </p>
                    <p class="organization">
                        <xsl:apply-templates select="ExpertOrganization"/>
                    </p>
                    <br/>

                    <!-- Вывод cведений о заявителе -->
                    <p class="title">1.2. Сведения о заявителе</p>
                    <p class="organization">
                        <xsl:choose>
                            <xsl:when test="Declarant/Organization">
                                <xsl:apply-templates select="Declarant/Organization"/>
                            </xsl:when>
                            <xsl:when test="Declarant/ForeignOrganization">
                                <xsl:apply-templates select="Declarant/ForeignOrganization"/>
                            </xsl:when>
                            <xsl:when test="Declarant/IP">
                                <xsl:apply-templates select="Declarant/IP"/>
                            </xsl:when>
                            <xsl:when test="Declarant/Person">
                                <xsl:apply-templates select="Declarant/Person"/>
                            </xsl:when>
                        </xsl:choose>
                    </p>
                    <br/>

                    <!-- Вывод cведений об основании проведения экспертизы -->
                    <p class="title">
                        <xsl:choose>
                            <xsl:when test="ExaminationObject/ExaminationStage = 1">1.3. Основания для проведения экспертизы</xsl:when>
                            <xsl:when test="ExaminationObject/ExaminationStage = 2">1.3. Основания для проведения повторной экспертизы</xsl:when>
                            <xsl:when test="ExaminationObject/ExaminationStage = 3">1.3. Основания для проведения оценки соответствия в рамках экспертного сопровождения</xsl:when>
                        </xsl:choose>
                    </p>
                    <xsl:if test="Documents/Document[DocType = '01.01' or DocType = '01.02']">
                        <xsl:for-each select="Documents/Document[DocType = '01.01' or DocType = '01.02']">
                            <xsl:sort select="DocType"/>
                            <p>
                                <xsl:number value="position()" format="1. "/>
                                <xsl:apply-templates select="."/>
                            </p>
                        </xsl:for-each>
                    </xsl:if>
                    <xsl:if test="not(Documents/Document[DocType = '01.01' or DocType = '01.02'])">
                        <p>Документы не представлены.</p>
                    </xsl:if>
                    <br/>

                    <!-- Вывод cведений о заключении государственной экологической экспертизы -->
                    <!-- Выводится если объект экспертзы не РИИ (отдельно) и не ПДОСС (отдельно) -->
                    <xsl:if test="not($ExType = 'РИИ') and not($ExType = 'ПДОСС')">
                        <p class="title">1.4. Сведения о положительном заключении государственной экологической экспертизы</p>
                        <xsl:if test="EcologyExpertise/NeedExpertise = 'нет'">
                            <p>Проведение государственной экологической экспертизы в отношении представленной проектной документации законодательством Российской Федерации не предусмотрено.</p>
                            <xsl:if test="EcologyExpertise/Comment">
		                        <xsl:call-template name="StringReplace">
									<xsl:with-param name="input" select="EcologyExpertise/Comment"/>
								</xsl:call-template>
                            </xsl:if>
                        </xsl:if>
                        <xsl:if test="EcologyExpertise/NeedExpertise = 'да'">
                            <xsl:call-template name="StringReplace">
								<xsl:with-param name="input" select="EcologyExpertise/Comment"/>
							</xsl:call-template>
							
							<xsl:if test="Documents/Document[DocType = '02.04']">
                            <xsl:for-each select="Documents/Document[DocType = '02.04']">
                                <p><xsl:number value="position()" format="1. "/><xsl:apply-templates select="."/></p>
                            </xsl:for-each>
							</xsl:if>
							<xsl:if test="not(Documents/Document[DocType = '02.04']) and not(EcologyExpertise/Comment)">
								<p>Документы не представлены.</p>
							</xsl:if>
                        </xsl:if>
                        <br/>
                    </xsl:if>

                    <!-- Вывод cведений о составе документов, представленных для проведения экспертизы -->
                    <p class="title">
                        <xsl:choose>
                            <xsl:when test="not($ExType = 'РИИ') and not($ExType = 'ПДОСС')">1.5. </xsl:when>
                            <xsl:otherwise>1.4. </xsl:otherwise>
                        </xsl:choose>
                        <xsl:choose>
                            <xsl:when test="ExaminationObject/ExaminationStage = 1">Сведения о составе документов, представленных для проведения экспертизы</xsl:when>
                            <xsl:when test="ExaminationObject/ExaminationStage = 2">Сведения о составе документов, представленных для проведения повторной экспертизы</xsl:when>
                            <xsl:when test="ExaminationObject/ExaminationStage = 3">Сведения о составе документов, представленных для проведения оценки соответствия в рамках экспертного сопровождения</xsl:when>
                        </xsl:choose>


                    </p>
                    <xsl:for-each select="Documents/Document[((DocType != '01.01' and DocType != '01.02' and DocType &lt; '06.00') or (DocType &gt; '09.00' and DocType &lt; '25.00' and DocType != '11.05' and DocType != '11.06') or DocType &gt; '26.00') and File]">
                        <xsl:sort select="DocType"/>
                        <p>
                            <xsl:number value="position()" format="1. "/>
                            <xsl:apply-templates select="."/>
                        </p>
                    </xsl:for-each>
                    <xsl:variable name="DocsNum" select="count(Documents/Document[((DocType != '01.01' and DocType != '01.02' and DocType &lt; '06.00') or (DocType &gt; '09.00' and DocType &lt; '25.00' and DocType != '11.05' and DocType != '11.06') or DocType &gt; '26.00') and File])"/>
                    <xsl:if test="Documents/Document[DocType &gt; '06.00' and DocType &lt; '07.00' and File]">
                        <p>
                            <xsl:number value="$DocsNum + 1" format="1. "/>
                            <xsl:text>Результаты инженерных изысканий (</xsl:text>
                            <xsl:value-of select="count(Documents/Document[DocType &gt; '06.00' and DocType &lt; '07.00' and File])"/>
                            <xsl:text> документ(ов) - </xsl:text>
                            <xsl:value-of select="count(Documents/Document[DocType &gt; '05.99' and DocType &lt; '07.00']/File)"/>
                            <xsl:text> файл(ов))</xsl:text>
                        </p>
                    </xsl:if>
                    <xsl:if test="Documents/Document[(DocType &gt; '07.00' and DocType &lt; '09.00') or (DocType &gt; '25.00' and DocType &lt; '26.00') or DocType = '11.05' or DocType = '11.06' and File]">
                        <p>
                            <xsl:if test="Documents/Document[DocType &gt; '06.00' and DocType &lt; '07.00' and File]">
                                <xsl:number value="$DocsNum + 2" format="1. "/>
                            </xsl:if>
                            <xsl:if test="not(Documents/Document[DocType &gt; '06.00' and DocType &lt; '07.00' and File])">
                                <xsl:number value="$DocsNum + 1" format="1. "/>
                            </xsl:if>
                            <xsl:text>Проектная документация (</xsl:text>
                            <xsl:value-of select="count(Documents/Document[((DocType &gt; '07.00' and DocType &lt; '09.00') or (DocType &gt; '25.00' and DocType &lt; '26.00') or DocType = '11.05' or DocType = '11.06') and File])"/>
                            <xsl:text> документ(ов) - </xsl:text>
                            <xsl:value-of select="count(Documents/Document[(DocType &gt; '07.00' and DocType &lt; '09.00') or (DocType &gt; '25.00' and DocType &lt; '26.00' or DocType = '11.05' or DocType = '11.06')]/File)"/>
                            <xsl:text> файл(ов))</xsl:text>
                        </p>
                    </xsl:if>

                    <br/>

                    <xsl:if test="ExaminationObject/ExaminationStageNote and ExaminationObject/ExaminationStageNote != ''">
                        <xsl:call-template name="StringReplace">
                            <xsl:with-param name="input" select="ExaminationObject/ExaminationStageNote"/>
                        </xsl:call-template>
                        <br/>
                    </xsl:if>

                    <!-- Вывод cведений о ранее подготовленных заключениях государственной экспертизы в отношении ОКС  -->
                    <p class="title">
                        <xsl:choose>
                            <xsl:when test="not($ExType = 'РИИ') and not($ExType = 'ПДОСС')">1.6. </xsl:when>
                            <xsl:otherwise>1.5. </xsl:otherwise>
                        </xsl:choose>
                        <xsl:choose>
                            <xsl:when test="ExaminationObject/ExaminationStage = 1">Сведения о ранее выданных заключениях экспертизы в отношении объекта капитального строительства, 
<xsl:if test="ExaminationObject/ExaminationObjectType = 1">
            <xsl:text> результаты инженерных изысканий по которому представлены</xsl:text>
        </xsl:if>
        <xsl:if test="ExaminationObject/ExaminationObjectType = 2">
            <xsl:text> проектная документации по которому представлена</xsl:text>
        </xsl:if>
        <xsl:if test="ExaminationObject/ExaminationObjectType = 3">
            <xsl:text> проектная документация и результаты инженерных изысканий по которому представлены</xsl:text>
        </xsl:if>
		для проведения экспертизы</xsl:when>
                            <xsl:when test="ExaminationObject/ExaminationStage = 2">Сведения о ранее выданных заключениях экспертизы проектной документации и (или) результатов инженерных изысканий в отношении объекта капитального строительства, <xsl:if test="ExaminationObject/ExaminationObjectType = 1">
            <xsl:text> результаты инженерных изысканий по которому представлены</xsl:text>
        </xsl:if>
        <xsl:if test="ExaminationObject/ExaminationObjectType = 2">
            <xsl:text> проектная документации по которому представлена</xsl:text>
        </xsl:if>
        <xsl:if test="ExaminationObject/ExaminationObjectType = 3">
            <xsl:text> проектная документация и результаты инженерных изысканий по которому представлены</xsl:text>
        </xsl:if> для проведения повторной экспертизы</xsl:when>
                            <xsl:when test="ExaminationObject/ExaminationStage = 3">Сведения о ранее выданных заключениях экспертизы в отношении объекта капитального строительства, <xsl:if test="ExaminationObject/ExaminationObjectType = 1">
            <xsl:text> результаты инженерных изысканий по которому представлены</xsl:text>
        </xsl:if>
        <xsl:if test="ExaminationObject/ExaminationObjectType = 2">
            <xsl:text> проектная документации по которому представлена</xsl:text>
        </xsl:if>
        <xsl:if test="ExaminationObject/ExaminationObjectType = 3">
            <xsl:text> проектная документация и результаты инженерных изысканий по которому представлены</xsl:text>
        </xsl:if> для проведения оценки соответствия в рамках экспертного сопровождения</xsl:when>
                        </xsl:choose>
                    </p>
                    <xsl:if test="not(PreviousConclusions) and ExaminationObject/ExaminationStage = 1">
                        <p>
                            <xsl:if test="ExaminationObject/ExaminationForm = 1">Государственная </xsl:if>
                            <xsl:if test="ExaminationObject/ExaminationForm = 2">Негосударственная </xsl:if>
                            <xsl:if test="$ExType = 'РИИ'">экспертиза в отношении результатов инженерных изысканий проведена впервые.</xsl:if>
                            <xsl:if test="$ExType = 'ПД' or $ExType = 'ПД+ПДОСС' or $ExType = 'ПДОСС'">экспертиза в отношении проектной документации проведена впервые.</xsl:if>
                            <xsl:if test="$ExType = 'РИИ+ПД' or $ExType = 'РИИ+ПД+ПДОСС'">экспертиза в отношении проектной документации и результатов инженерных изысканий проведена впервые.</xsl:if>
                        </p>
                    </xsl:if>

                    <xsl:for-each select="PreviousConclusions/PreviousConclusion">
                        <xsl:sort select="Date" order="ascending"/>
                        <p>
                            <xsl:number value="position()" format="1. "/>
                            <xsl:apply-templates select="."/>
                        </p>
                    </xsl:for-each>
                    <br/>


                    <!-- Вывод cведений о ранее подготовленных заключениях о соответствии в отношении ОКС в рамках экспертного сопровождения -->
                    <xsl:if test="PreviousSimpleConclusions">
                        <p class="title">1.7. Сведения о ранее выданных заключениях по результатам оценки соответствия в рамках экспертного сопровождения в отношении объекта капитального строительства, 
		<xsl:if test="ExaminationObject/ExaminationObjectType = 1">
            <xsl:text> результаты инженерных изысканий по которому представлены</xsl:text>
        </xsl:if>
        <xsl:if test="ExaminationObject/ExaminationObjectType = 2">
            <xsl:text> проектная документации по которому представлена</xsl:text>
        </xsl:if>
        <xsl:if test="ExaminationObject/ExaminationObjectType = 3">
            <xsl:text> проектная документация и результаты инженерных изысканий по которому представлены</xsl:text>
        </xsl:if>
						 для проведения оценки соответствия в рамках экспертного сопровождения</p>
                        <xsl:for-each select="PreviousSimpleConclusions/PreviousSimpleConclusion">
                            <xsl:sort select="Date" order="ascending"/>
                            <p>
                                <xsl:number value="position()" format="1. "/>
                                <xsl:apply-templates select="."/>
                            </p>
                        </xsl:for-each>
                        <br/>
                    </xsl:if>
                    <br/>

                    <!-- Вывод заголовка второго раздела  -->
                    <p class="title">
                        <xsl:choose>
                            <xsl:when test="ExaminationObject/ExaminationStage = 1"> II. Сведения, содержащиеся в документах, представленных для проведения экспертизы проектной документации</xsl:when>
                            <xsl:when test="ExaminationObject/ExaminationStage = 2"> II. Сведения, содержащиеся в документах, представленных для проведения повторной экспертизы проектной документации</xsl:when>
                            <xsl:when test="ExaminationObject/ExaminationStage = 3"> II. Сведения, содержащиеся в документах, представленных для проведения оценки соответствия проектной документации в рамках экспертного сопровождения</xsl:when>
                        </xsl:choose>
                    </p>
                    <br/>

                    <p class="title"> 2.1. Сведения об объекте капитального строительства, применительно к которому подготовлена проектная документация </p>
                    <br/>

                    <!-- Вывод наименования и адреса объекта  -->
                    <p class="title"> 2.1.1. Сведения о наименовании объекта капитального строительства, его почтовый (строительный) адрес или местоположение </p>
                    <p>
                        <span class="field">Наименование объекта капитального строительства: </span>
                        <xsl:value-of select="Object/Name"/>
                    </p>
                    <p class="field"> Почтовый (строительный) адрес (местоположение) объекта капитального строительства: </p>
                    <xsl:for-each select="Object/Address">
                        <p>
                            <xsl:apply-templates select="."/>
                            <xsl:if test="position() != last()">
                                <xsl:text>;</xsl:text>
                            </xsl:if>
                            <xsl:if test="position() = last()">
                                <xsl:text>.</xsl:text>
                            </xsl:if>
                        </p>
                    </xsl:for-each>
                    <br/>

                    <!-- Вывод сведений об объекте капитального строительства -->
                    <p class="title"> 2.1.2. Сведения о функциональном назначении объекта капитального строительства </p>
                    <xsl:if test="Object/FunctionsClass">
                        <p>
                            <span class="field">Функциональное назначение по классификатору объектов капитального строительства по их назначению и функционально-технологическим особенностям: </span>
                            <xsl:value-of select="Object/FunctionsClass"/>
                        </p>
                    </xsl:if>
                    <br/>
                    <br/>

                    <!-- Вывод сведений о технико-экономических показателях объекта капитального строительства -->
                    <xsl:if test="Object/TEI">
                        <p class="title"> 2.1.3. Сведения о технико-экономических показателях объекта капитального строительства </p>
                        <table style="border-style: solid; border-width:1px; border-collapse: collapse; align: center;">
                            <tr>
                                <td style="width: 50%; border-style: solid; border-width:1px; font-weight: bold; text-align: center;">Наименование технико-экономического показателя</td>
                                <td style="width: 25%; border-style: solid; border-width:1px; font-weight: bold; text-align: center;">Единица измерения</td>
                                <td style="width: 25%; border-style: solid; border-width:1px; font-weight: bold; text-align: center;">Значение </td>
                            </tr>
                            <xsl:apply-templates select="Object/TEI"/>
                        </table>
                        <br/>
                    </xsl:if>

                    <!-- Вывод сведений о составных частях объекта -->
                    <xsl:if test="not($ExType = 'РИИ')">
                        <p class="title"> 2.2. Сведения о зданиях (сооружениях), входящих в состав сложного объекта, применительно к которому подготовлена проектная документация </p>
                        <br/>
                        <xsl:choose>
                            <xsl:when test="Object/ObjectPart">
                                <xsl:for-each select="Object/ObjectPart">
                                    <p>
                                        <span class="field">Наименование объекта капитального строительства: </span>
                                        <xsl:value-of select="Name"/>
                                    </p>
                                    <p>
                                        <span class="field">Адрес объекта капитального строительства: </span>
                                        <xsl:apply-templates select="Address"/>
                                    </p>
                                    <xsl:if test="FunctionsClass">
                                        <p>
                                            <span class="field">Функциональное назначение по классификатору объектов капитального строительства по их назначению и функционально-технологическим особенностям: </span>
                                            <xsl:value-of select="FunctionsClass"/>
                                        </p>
                                    </xsl:if>
                                    <br/>

                                    <xsl:if test="TEI">
                                        <p class="title"> Технико-экономические показатели объекта капитального строительства </p>
                                        <table style="border-style: solid; border-width:1px; border-collapse: collapse; align: center;">
                                            <tr>
                                                <td style="width: 50%; border-style: solid; border-width:1px; font-weight: bold; text-align: center;">Наименование технико-экономического показателя</td>
                                                <td style="width: 25%; border-style: solid; border-width:1px; font-weight: bold; text-align: center;">Единица измерения</td>
                                                <td style="width: 25%; border-style: solid; border-width:1px; font-weight: bold;text-align: center; ">Значение </td>
                                            </tr>
                                            <xsl:apply-templates select="TEI"/>
                                        </table>
                                    </xsl:if>
                                    <hr/>
                                    <br/>
                                    <br/>
                                </xsl:for-each>
                                <br/>

                            </xsl:when>
                            <xsl:otherwise>
                                <p> Проектная документация не предусматривает строительство, реконструкцию, капитальный ремонт сложного объекта. </p>
                            </xsl:otherwise>
                        </xsl:choose>

                    </xsl:if>

                    <!-- Вывод сведений об источнике финансирования -->
                    <p class="title">
                        <xsl:choose>
                            <xsl:when test="not($ExType = 'РИИ')">2.3. </xsl:when>
                            <xsl:otherwise>2.2. </xsl:otherwise>
                        </xsl:choose> Сведения об источнике (источниках) и размере финансирования строительства, реконструкции, капитального ремонта, сноса объекта капитального строительства </p>

                    <xsl:choose>
                        <xsl:when test="Finance[FinanceType = 1] or Finance[FinanceType = 2]">
                            <table style="border-style: solid; border-width:1px; border-collapse: collapse; align: center;">
                                <tr>
                                    <td style="width: 40%; border-style: solid; border-width:1px; font-weight: bold; text-align: center;">Источник финансирования <xsl:if test="FinanceComment">
                                            <sup>*</sup>
                                        </xsl:if>
                                    </td>
                                    <td style="width: 40%; border-style: solid; border-width:1px; font-weight: bold;text-align: center;">Наименование уровня бюджета/ Сведения о юридическом лице (владельце средств)</td>
                                    <td style="width: 20%; border-style: solid; border-width:1px; font-weight: bold;text-align: center;">Доля финансирования, %</td>
                                </tr>
                                <xsl:for-each select="Finance">
                                    <tr>
                                        <td style="border-style: solid; border-width:1px; text-align: center;">
                                            <xsl:choose>
                                                <xsl:when test="FinanceType = 1"> Бюджетные средства </xsl:when>
                                                <xsl:when test="FinanceType = 2"> Средства юридических лиц, перечисленных в части 2 статьи 8.3 ГрК РФ </xsl:when>
                                                <xsl:when test="FinanceType = 3"> Средства, не входящие в перечень, указанный в части 2 статьи 8.3 Градостроительного кодекса Российской Федерации </xsl:when>
                                            </xsl:choose>
                                        </td>
                                        <td class="organization">
                                            <xsl:if test="FinanceType = 1">
                                                <xsl:choose>
                                                    <xsl:when test="BudgetType = 1">Федеральный бюджет</xsl:when>
                                                    <xsl:when test="BudgetType = 2">Бюджет субъекта Российской Федерации</xsl:when>
                                                    <xsl:when test="BudgetType = 3">Местный бюджет</xsl:when>
                                                    <xsl:when test="BudgetType = 4">Бюджет государственного внебюджетного фонда Российской Федерации</xsl:when>
                                                    <xsl:when test="BudgetType = 5">Бюджет территориального государственного внебюджетного фонда</xsl:when>
                                                </xsl:choose>
                                            </xsl:if>
                                            <xsl:if test="FinanceType = 2">
                                                <xsl:apply-templates select="FinanceOwner/Organization"/>
                                                <xsl:apply-templates select="FinanceOwner/ForeignOrganization"/>
                                                <xsl:apply-templates select="FinanceOwner/IP"/>
                                                <xsl:apply-templates select="FinanceOwner/Person"/>
                                            </xsl:if>
                                            <xsl:if test="FinanceType = 3">
                                                <xsl:text> </xsl:text>
                                            </xsl:if>
                                        </td>
                                        <td style="border-style: solid; border-width:1px; text-align: center;">
                                            <xsl:if test="FinanceSize = 0">-</xsl:if>
                                            <xsl:if test="FinanceSize &gt; 0">
                                                <xsl:value-of select="FinanceSize"/>
                                            </xsl:if>
                                        </td>
                                    </tr>
                                </xsl:for-each>
                            </table>
                            <xsl:if test="FinanceComment">
                                <xsl:call-template name="StringReplaceComment">
                                    <xsl:with-param name="input" select="FinanceComment"/>
                                    <xsl:with-param name="count" select="1"/>
                                    <xsl:with-param name="first" select="1"/>
                                </xsl:call-template>
                            </xsl:if>

                        </xsl:when>
                        <xsl:otherwise>
                            <p>Финансирование работ по строительству (реконструкции, капитальному ремонту, сносу) объекта капитального строительства (работ по сохранению объекта культурного наследия (памятника истории и культуры) народов Российской Федерации) предполагается осуществлять без привлечения средств, указанных в части 2 статьи 8.3 Градостроительного кодекса Российской Федерации.</p>
                        </xsl:otherwise>
                    </xsl:choose>
                    <br/>

                    <!-- Вывод сведений о природных и техногенных условиях территории -->
                    <p class="title">
                        <xsl:choose>
                            <xsl:when test="not($ExType = 'РИИ')">2.4. </xsl:when>
                            <xsl:otherwise>2.3. </xsl:otherwise>
                        </xsl:choose> Сведения о природных и техногенных условиях территории, на которой планируется осуществлять строительство, реконструкцию, капитальный ремонт объекта капитального строительства </p>
                    <xsl:if test="ClimateConditions">
                        <p> Климатический район, подрайон: <xsl:text> </xsl:text>
                            <xsl:for-each select="ClimateConditions/ClimateDistrict">
                                <xsl:value-of select="."/>
                                <xsl:if test="position() != last()">, </xsl:if>
                            </xsl:for-each>
                        </p>
                        <p> Геологические условия: <xsl:text> </xsl:text>
                            <xsl:for-each select="ClimateConditions/GeologicalConditions">
                                <xsl:value-of select="."/>
                                <xsl:if test="position() != last()">, </xsl:if>
                            </xsl:for-each>
                        </p>
                        <p> Ветровой район: <xsl:text> </xsl:text>
                            <xsl:for-each select="ClimateConditions/WindDistrict">
                                <xsl:value-of select="."/>
                                <xsl:if test="position() != last()">, </xsl:if>
                            </xsl:for-each>
                        </p>
                        <p> Снеговой район: <xsl:text> </xsl:text>
                            <xsl:for-each select="ClimateConditions/SnowDistrict">
                                <xsl:value-of select="."/>
                                <xsl:if test="position() != last()">, </xsl:if>
                            </xsl:for-each>
                        </p>
                        <p> Сейсмическая активность (баллов): <xsl:text> </xsl:text>
                            <xsl:for-each select="ClimateConditions/SeismicActivity">
                                <xsl:value-of select="."/>
                                <xsl:if test="position() != last()">, </xsl:if>
                            </xsl:for-each>
                        </p>
                        <xsl:if test="ClimateConditions/SeismicActivityCalculatedValue">
                            <p> Расчетное значение сейсмической активности (баллов): <xsl:text> </xsl:text>
                                <xsl:value-of select="ClimateConditions/SeismicActivityCalculatedValue/MinValue"/>
                                <xsl:if test="ClimateConditions/SeismicActivityCalculatedValue/MaxValue">
                                    <xsl:text> - </xsl:text>
                                    <xsl:value-of select="ClimateConditions/SeismicActivityCalculatedValue/MaxValue"/>
                                </xsl:if>
                            </p>
                        </xsl:if>

                    </xsl:if>

                    <!-- Вывод сведений о природных и техногенных условиях территории (если ПД или ПД+ПДОСС, то ClimateConditionsNote, если присутсвует РИИ, то EngineeringSurveyType из заключений экспертов)-->
                    <!-- отключено в связи с исключением сведений о EngineeringSurveyConditions 
						<xsl:choose>
                        <xsl:when test="$ExType = 'ПД' or $ExType = 'ПДОСС' or $ExType = 'ПД+ПДОСС'"> 
-->
                    <xsl:if test="ClimateConditionsNote">
                        <xsl:call-template name="StringReplace">
                            <xsl:with-param name="input" select="ClimateConditionsNote"/>
                        </xsl:call-template>
                    </xsl:if>
                    <!--
                        </xsl:when>
                        <xsl:otherwise>
                            <xsl:for-each select="ExpertEngineeringSurveys[EngineeringSurveyConditions != '']">
                                <br/>
                                <p class="title">
                                    <xsl:choose>
                                        <xsl:when test="$ExType = 'РИИ'">2.3.</xsl:when>
                                        <xsl:otherwise>2.4.</xsl:otherwise>
                                    </xsl:choose>
                                    <xsl:number value="position()" format="1. "/>
                                    <xsl:call-template name="MakeRII">
                                        <xsl:with-param name="TypeCode" select="@EngineeringSurveyType"/>
                                    </xsl:call-template>: 
                                </p>
                                <xsl:call-template name="StringReplace">
                                    <xsl:with-param name="input" select="EngineeringSurveyConditions"/>
                                </xsl:call-template>

                            </xsl:for-each>

                        </xsl:otherwise>
                    </xsl:choose>
-->
                    <xsl:if test="not(ClimateConditions) and not(ClimateConditionsNote)">
                        <p> Сведения о природных и техногенных условиях территории, на которой планируется осуществлять строительство, реконструкцию, капитальный ремонт объекта капитального строительства не представлены. </p>
                    </xsl:if>
                    <br/>

                    <!-- Вывод сведений об индивидуальных предпринимателях и (или) юридических лицах, подготовивших проектную документацию -->
                    <xsl:if test="not($ExType = 'РИИ')">
                        <p class="title">
                            <xsl:choose>
                                <xsl:when test="ExaminationObject/ExaminationStage = 1"> 2.5. Сведения об индивидуальных предпринимателях и (или) юридических лицах, подготовивших проектную документацию</xsl:when>
                                <xsl:when test="ExaminationObject/ExaminationStage = 2"> 2.5. Сведения об индивидуальных предпринимателях и (или) юридических лицах, подготовивших изменения в проектную документацию</xsl:when>
                                <xsl:when test="ExaminationObject/ExaminationStage = 3"> 2.5. Сведения об индивидуальных предпринимателях и (или) юридических лицах, подготовивших изменения в проектную документацию</xsl:when>
                            </xsl:choose>
                        </p>
                        <xsl:if test="Designer[@General = 'да']">
                            <p class="field no-first-line">Генеральный проектировщик:</p>
                            <xsl:for-each select="Designer[@General = 'да']">
                                <p class="organization">
                                    <xsl:choose>
                                        <xsl:when test="Organization">
                                            <xsl:apply-templates select="Organization"/>
                                        </xsl:when>
                                        <xsl:when test="ForeignOrganization">
                                            <xsl:apply-templates select="ForeignOrganization"/>
                                        </xsl:when>
                                        <xsl:when test="IP">
                                            <xsl:apply-templates select="IP"/>
                                        </xsl:when>
                                    </xsl:choose>
                                </p>
                            </xsl:for-each>
                            <br/>
                            <br/>
                            <xsl:if test="Designer[@General != 'да' or not(@General)]">
                                <p class="field no-first-line">Субподрядные проектные организации:</p>
                            </xsl:if>
                        </xsl:if>

                        <xsl:for-each select="Designer[@General != 'да' or not(@General)]">
                            <p class="organization">
                                <xsl:choose>
                                    <xsl:when test="Organization">
                                        <xsl:apply-templates select="Organization"/>
                                    </xsl:when>
                                    <xsl:when test="ForeignOrganization">
                                        <xsl:apply-templates select="ForeignOrganization"/>
                                    </xsl:when>
                                    <xsl:when test="IP">
                                        <xsl:apply-templates select="IP"/>
                                    </xsl:when>
                                </xsl:choose>
                            </p>
                            <br/>
                        </xsl:for-each>
                    </xsl:if>

                    <!-- Вывод сведений об использовании ЭЭПД -->
                    <xsl:if test="not($ExType = 'РИИ') and not($ExType = 'ПДОСС')">
                        <p class="title"> 2.6. Сведения об использовании при подготовке проектной документации типовой проектной документации </p>
                        <xsl:choose>
                            <xsl:when test="EEPDUse">
                                <xsl:for-each select="EEPDUse">
                                    <xsl:if test="EEPDNumber">
                                        <xsl:if test="EEPDNumber != ''">
                                            <p> Положительное заключение экспертизы от <xsl:text> </xsl:text>
                                                <xsl:call-template name="formatdate">
                                                    <xsl:with-param name="DateTimeStr" select="EEPDDate"/>
                                                </xsl:call-template>
                                                <xsl:text> № </xsl:text>
                                                <xsl:value-of select="EEPDNumber"/>
                                                <xsl:text>.</xsl:text>
                                            </p>
                                        </xsl:if>
                                    </xsl:if>
                                    <xsl:if test="EEPDNote != ''">
                                        <xsl:call-template name="StringReplace">
                                            <xsl:with-param name="input" select="EEPDNote"/>
                                        </xsl:call-template>
                                    </xsl:if>
                                    <br/>
                                </xsl:for-each>
                            </xsl:when>
                            <xsl:otherwise>
                                <p>Использование типовой проектной документации при подготовке проектной документации не предусмотрено.</p>
                            </xsl:otherwise>
                        </xsl:choose>

                        <br/>
                    </xsl:if>

                    <!-- Вывод сведений об задании на проектирование -->
                    <xsl:if test="not($ExType = 'РИИ')">
                        <p class="title">
                            <xsl:choose>
                                <xsl:when test="$ExType = 'ПДОСС'">2.6. </xsl:when>
                                <xsl:otherwise>2.7. </xsl:otherwise>
                            </xsl:choose> Сведения о задании застройщика (технического заказчика) на разработку проектной документации </p>
                        <xsl:for-each select="Documents/Document[DocType = '05.03']">
                            <p>
                                <xsl:number value="position()" format="1. "/>
                                <xsl:apply-templates select="."/>
                            </p>
                        </xsl:for-each>
                        <xsl:if test="not(Documents/Document[DocType = '05.03'])">
                            <p>Сведения отсутствуют.</p>
                        </xsl:if>
                        <br/>
                    </xsl:if>

                    <!-- Вывод сведений о документации по планировке территории -->
                    <xsl:if test="not($ExType = 'РИИ') and not($ExType = 'ПДОСС')">
                        <p class="title"> 2.8. Сведения о документации по планировке территории, о наличии разрешений на отклонение от предельных параметров разрешенного строительства, реконструкции объектов капитального строительства </p>
                        <xsl:for-each select="Documents/Document[DocType &gt; '03.00' and DocType &lt; '04.00']">
                            <p>
                                <xsl:number value="position()" format="1. "/>
                                <xsl:apply-templates select="."/>
                            </p>
                        </xsl:for-each>
                        <xsl:if test="not(Documents/Document[DocType &gt; '03.00' and DocType &lt; '04.00'])">
                            <xsl:if test="Object/Type != 3">
                                <p>Сведения отсутствуют.</p>
                            </xsl:if>
                            <xsl:if test="Object/Type = 3">
                                <p>Подготовка документации по планировке территории в отношении объекта капитального строительства не требуется.</p>
                            </xsl:if>
                        </xsl:if>
                        <br/>
                    </xsl:if>

                    <!-- Вывод сведений о технических условиях -->
                    <xsl:if test="not($ExType = 'РИИ') and not($ExType = 'ПДОСС')">
                        <p class="title"> 2.9. Сведения о технических условиях подключения объекта капитального строительства к сетям инженерно-технического обеспечения </p>
                        <xsl:for-each select="Documents/Document[DocType = '04.01']">
                            <p>
                                <xsl:number value="position()" format="1. "/>
                                <xsl:apply-templates select="."/>
                            </p>
                        </xsl:for-each>
                        <xsl:if test="not(Documents/Document[DocType = '04.01'])">
                            <p>Сведения отсутствуют.</p>
                        </xsl:if>
                        <br/>
                    </xsl:if>

                    <!-- Вывод сведений о кадастровых номерах -->
                    <p class="title">
                        <xsl:choose>
                            <xsl:when test="$ExType = 'РИИ'">2.4. </xsl:when>
                            <xsl:when test="$ExType = 'ПДОСС'">2.7. </xsl:when>
                            <xsl:otherwise>2.10. </xsl:otherwise>
                        </xsl:choose> Кадастровый номер земельного участка (земельных участков), в пределах которого (которых) расположен или планируется расположение объекта капитального строительства, не являющегося линейным объектом </p>
                    <p>
                        <xsl:choose>
                            <xsl:when test="CadastralNumber">
                                <xsl:for-each select="CadastralNumber">
                                    <xsl:value-of select="."/>
                                    <xsl:if test="position() != last()">
                                        <xsl:text>, </xsl:text>
                                    </xsl:if>
                                </xsl:for-each>
                            </xsl:when>
                            <xsl:otherwise> Сведения отсутствуют. </xsl:otherwise>
                        </xsl:choose>
                    </p>
                    <br/>

                    <!-- Вывод cведений о застройщике, техническом заказчике, иных лицах  -->
                    <xsl:if test="not($ExType = 'РИИ')">
                        <p class="title">
                            <xsl:choose>
                                <xsl:when test="$ExType = 'ПДОСС'">2.8. </xsl:when>
                                <xsl:otherwise>2.11. </xsl:otherwise>
                            </xsl:choose>
                            <xsl:choose>
                                <xsl:when test="ExaminationObject/ExaminationStage = 1"> Сведения о застройщике (техническом заказчике), обеспечившем подготовку проектной документации</xsl:when>
                                <xsl:when test="ExaminationObject/ExaminationStage = 2 or ExaminationObject/ExaminationStage = 3">Сведения о застройщике (техническом заказчике), обеспечившем подготовку изменений в проектную документацию</xsl:when>
                            </xsl:choose>
                        </p>
                        <br/>
                        <xsl:if test="count(ProjectDocumentsDeveloper) = 1">
                            <p class="field no-first-line">Застройщик:</p>
                        </xsl:if>
                        <xsl:if test="count(ProjectDocumentsDeveloper) &gt; 1">
                            <p class="field no-first-line">Застройщики:</p>
                        </xsl:if>
                        <xsl:if test="ProjectDocumentsDeveloper">
                            <xsl:for-each select="ProjectDocumentsDeveloper">
                                <p class="organization">
                                    <xsl:choose>
                                        <xsl:when test="Organization">
                                            <xsl:apply-templates select="Organization"/>
                                        </xsl:when>
                                        <xsl:when test="ForeignOrganization">
                                            <xsl:apply-templates select="ForeignOrganization"/>
                                        </xsl:when>
                                        <xsl:when test="IP">
                                            <xsl:apply-templates select="IP"/>
                                        </xsl:when>
                                        <xsl:when test="Person">
                                            <xsl:apply-templates select="Person"/>
                                        </xsl:when>
                                    </xsl:choose>
                                </p>
                                <br/>
                            </xsl:for-each>
                        </xsl:if>

                        <xsl:if test="count(ProjectDocumentsTechnicalCustomer) = 1">
                            <p class="field no-first-line">Технический заказчик:</p>
                        </xsl:if>
                        <xsl:if test="count(ProjectDocumentsTechnicalCustomer) &gt; 1">
                            <p class="field no-first-line">Технические заказчики:</p>
                        </xsl:if>
                        <xsl:if test="ProjectDocumentsTechnicalCustomer">
                            <xsl:for-each select="ProjectDocumentsTechnicalCustomer">
                                <p class="organization">
                                    <xsl:choose>
                                        <xsl:when test="Organization">
                                            <xsl:apply-templates select="Organization"/>
                                        </xsl:when>
                                        <xsl:when test="ForeignOrganization">
                                            <xsl:apply-templates select="ForeignOrganization"/>
                                        </xsl:when>
                                    </xsl:choose>
                                </p>
                                <br/>
                            </xsl:for-each>
                        </xsl:if>
                        <br/>

                        <p class="title">
                            <xsl:choose>
                                <xsl:when test="$ExType = 'ПДОСС'">2.9. </xsl:when>
                                <xsl:otherwise>2.12. </xsl:otherwise>
                            </xsl:choose> Сведения о подготовке проектной документации в форме информационной модели </p>

                        <xsl:if test="ExaminationObject/ProjectDocumentationIM = 'да'">
                            <p>Проектная документация подготовлена в форме информационной модели.</p>
                        </xsl:if>
                        <xsl:if test="ExaminationObject/ProjectDocumentationIM = 'нет'">
                            <p>Проектная документация подготовлена без применения технологий информационного моделирования.</p>
                        </xsl:if>
                        <br/>
                    </xsl:if>

                    <!-- Вывод заголовка третьего раздела  -->
                    <xsl:if test="$ExType = 'РИИ' or $ExType = 'РИИ+ПД' or $ExType = 'РИИ+ПД+ПДОСС'">

                        <p class="title">
                            <xsl:choose>
                                <xsl:when test="ExaminationObject/ExaminationStage = 1">III. Сведения, содержащиеся в документах, представленных для проведения экспертизы результатов инженерных изысканий</xsl:when>
                                <xsl:when test="ExaminationObject/ExaminationStage = 2">III. Сведения, содержащиеся в документах, представленных для проведения повторной экспертизы результатов инженерных изысканий</xsl:when>
                            </xsl:choose>
                        </p>
                        <br/>

                        <!-- Вывод cведений об инженерных изысканиях (вид, отчет, дата отчета, лицо, подготовившее отчет об инженерных изысканиях -->
                        <p class="title"> 3.1. Сведения о видах проведенных инженерных изысканий, дата подготовки отчетной документации о выполнении инженерных изысканий, сведения об индивидуальных предпринимателях и (или) юридических лицах, подготовивших отчетную документацию о выполнении инженерных изысканий </p>
                        <xsl:if test="Documents/Document[DocType &gt; '06.00' and DocType &lt; '07.00' and File]">
                            <table style="border-style: solid; border-width:1px; border-collapse: collapse; align: center; width: 100%;">
                                <tr>
                                    <td style="width: 35%; border-style: solid; border-width:1px; font-weight: bold;text-align: center; vertical-align: middle;">Наименование отчета</td>
                                    <td style="width: 15%; border-style: solid; border-width:1px; font-weight: bold;text-align: center; vertical-align: middle;">Дата отчета</td>
                                    <td style="width: 50%; border-style: solid; border-width:1px; font-weight: bold;text-align: center; vertical-align: middle;">Сведения об индивидуальных предпринимателях и (или) юридических лицах, подготовивших отчетную документацию о выполнении инженерных изысканий</td>
                                </tr>
                                <xsl:call-template name="EngineeringSurveysReports">
                                    <xsl:with-param name="Code" select="'06.01'"/>
                                </xsl:call-template>
                                <xsl:call-template name="EngineeringSurveysReports">
                                    <xsl:with-param name="Code" select="'06.02'"/>
                                </xsl:call-template>
                                <xsl:call-template name="EngineeringSurveysReports">
                                    <xsl:with-param name="Code" select="'06.03'"/>
                                </xsl:call-template>
                                <xsl:call-template name="EngineeringSurveysReports">
                                    <xsl:with-param name="Code" select="'06.04'"/>
                                </xsl:call-template>
                                <xsl:call-template name="EngineeringSurveysReports">
                                    <xsl:with-param name="Code" select="'06.05'"/>
                                </xsl:call-template>
                                <xsl:call-template name="EngineeringSurveysReports">
                                    <xsl:with-param name="Code" select="'06.06'"/>
                                </xsl:call-template>
                                <xsl:call-template name="EngineeringSurveysReports">
                                    <xsl:with-param name="Code" select="'06.07'"/>
                                </xsl:call-template>
                                <xsl:call-template name="EngineeringSurveysReports">
                                    <xsl:with-param name="Code" select="'06.08'"/>
                                </xsl:call-template>
                                <xsl:call-template name="EngineeringSurveysReports">
                                    <xsl:with-param name="Code" select="'06.09'"/>
                                </xsl:call-template>
                                <xsl:call-template name="EngineeringSurveysReports">
                                    <xsl:with-param name="Code" select="'06.10'"/>
                                </xsl:call-template>
                                <xsl:call-template name="EngineeringSurveysReports">
                                    <xsl:with-param name="Code" select="'06.11'"/>
                                </xsl:call-template>
                                <xsl:call-template name="EngineeringSurveysReports">
                                    <xsl:with-param name="Code" select="'06.99'"/>
                                </xsl:call-template>
                            </table>
                        </xsl:if>
                        <xsl:if test="not(Documents/Document[DocType &gt; '06.00' and DocType &lt; '07.00' and File])">
                            <p>Документы не представлены.</p>
                        </xsl:if>
                        <br/>

                        <!-- Вывод cведений о местоположении района проведения изысканий  -->
                        <p class="title"> 3.2. Сведения о местоположении района (площадки, трассы) проведения инженерных изысканий </p>
                        <p> Местоположение: <xsl:text> </xsl:text>
                            <xsl:for-each select="EngineeringSurveyAddress">
                                <xsl:if test="position() != 1">; </xsl:if>
                                <xsl:call-template name="MakeRegion">
                                    <xsl:with-param name="Code" select="EngineeringSurveyRegion"/>
                                </xsl:call-template>
                                <xsl:if test="EngineeringSurveyDistrict != ''">
                                    <xsl:if test="EngineeringSurveyRegion != '00'">, </xsl:if>
                                    <xsl:value-of select="EngineeringSurveyDistrict"/>
                                </xsl:if>
                            </xsl:for-each>
                        </p>
                        <br/>

                        <!-- Вывод cведений о застройщике, техническом заказчике, иных лицах  -->
                        <p class="title">
                            <xsl:choose>
                                <xsl:when test="ExaminationObject/ExaminationStage = 1">3.3. Сведения о застройщике (техническом заказчике), обеспечившем проведение инженерных изысканий </xsl:when>
                                <xsl:when test="ExaminationObject/ExaminationStage != 1">3.3. Сведения о застройщике (техническом заказчике), обеспечившем подготовку изменений в результаты инженерных изысканий</xsl:when>
                            </xsl:choose>
                        </p>
                        <br/>
                        <xsl:if test="count(EngineeringSurveyDeveloper) = 1">
                            <p class="field no-first-line">Застройщик:</p>
                        </xsl:if>
                        <xsl:if test="count(EngineeringSurveyDeveloper) &gt; 1">
                            <p class="field no-first-line">Застройщики:</p>
                        </xsl:if>
                        <xsl:if test="EngineeringSurveyDeveloper">
                            <xsl:for-each select="EngineeringSurveyDeveloper">
                                <p class="organization">
                                    <xsl:choose>
                                        <xsl:when test="Organization">
                                            <xsl:apply-templates select="Organization"/>
                                        </xsl:when>
                                        <xsl:when test="ForeignOrganization">
                                            <xsl:apply-templates select="ForeignOrganization"/>
                                        </xsl:when>
                                        <xsl:when test="IP">
                                            <xsl:apply-templates select="IP"/>
                                        </xsl:when>
                                        <xsl:when test="Person">
                                            <xsl:apply-templates select="Person"/>
                                        </xsl:when>
                                    </xsl:choose>
                                </p>
                                <br/>
                            </xsl:for-each>
                        </xsl:if>
                        <br/>

                        <xsl:if test="count(EngineeringSurveyTechnicalCustomer) = 1">
                            <p class="field no-first-line">Технический заказчик:</p>
                        </xsl:if>
                        <xsl:if test="count(EngineeringSurveyTechnicalCustomer) &gt; 1">
                            <p class="field no-first-line">Технические заказчики:</p>
                        </xsl:if>
                        <xsl:if test="EngineeringSurveyTechnicalCustomer">
                            <xsl:for-each select="EngineeringSurveyTechnicalCustomer">
                                <p class="organization">
                                    <xsl:choose>
                                        <xsl:when test="Organization">
                                            <xsl:apply-templates select="Organization"/>
                                        </xsl:when>
                                        <xsl:when test="ForeignOrganization">
                                            <xsl:apply-templates select="ForeignOrganization"/>
                                        </xsl:when>
                                    </xsl:choose>
                                </p>
                                <br/>
                            </xsl:for-each>
                        </xsl:if>
                        <br/>

                        <!-- Вывод cведений о задании застройщика (технического заказчика) на выполнение инженерных изысканий  -->
                        <p class="title">3.4. Сведения о задании застройщика (технического заказчика) на выполнение инженерных изысканий</p>
                        <xsl:for-each select="Documents/Document[DocType = '05.01']">
                            <p>
                                <xsl:number value="position()" format="1. "/>
                                <xsl:apply-templates select="."/>
                            </p>
                        </xsl:for-each>
                        <xsl:if test="not(Documents/Document[DocType = '05.01'])">
                            <p>Сведения отсутствуют.</p>
                        </xsl:if>
                        <br/>

                        <!-- Вывод cведений о программе инженерных изысканий  -->
                        <p class="title">3.5. Сведения о программе инженерных изысканий</p>
                        <xsl:for-each select="Documents/Document[DocType = '05.02']">
                            <p>
                                <xsl:number value="position()" format="1. "/>
                                <xsl:apply-templates select="."/>
                            </p>
                        </xsl:for-each>
                        <xsl:if test="not(Documents/Document[DocType = '05.02'])">
                            <p>Документы о программе инженерных изысканий не представлены.</p>
                        </xsl:if>
                        <br/>
                        <xsl:for-each select="ExpertEngineeringSurveys">
                            <xsl:if test="EngineeringSurveyProgramNote != ''">
                                <p>
                                    <b>
                                        <xsl:call-template name="MakeRII">
                                            <xsl:with-param name="TypeCode" select="@EngineeringSurveyType"/>
                                        </xsl:call-template>
                                    </b>
                                </p>
                                <xsl:call-template name="StringReplace">
                                    <xsl:with-param name="input" select="EngineeringSurveyProgramNote"/>
                                </xsl:call-template>
                            </xsl:if>
                            <br/>
                        </xsl:for-each>
                        <br/>

                        <p class="title"> 3.6. Сведения о подготовке отчетной документации о выполнении инженерных изысканий в форме информационной модели </p>

                        <xsl:if test="ExaminationObject/EngineeringSurveysIM = 'да'">
                            <p>Отчетная документация о выполнении инженерных изысканий подготовлена в форме информационной модели.</p>
                        </xsl:if>
                        <xsl:if test="ExaminationObject/EngineeringSurveysIM = 'нет'">
                            <p>Отчетная документация о выполнении инженерных изысканий подготовлена без применения технологий информационного моделирования.</p>
                        </xsl:if>
                        <br/>
                    </xsl:if>

                    <!-- Вывод заголовка четвертого (РИИ) или третьего(ПД, ПДОСС) раздела -->
                    <p class="title">
                        <xsl:choose>
                            <xsl:when test="$ExType = 'РИИ' or $ExType = 'РИИ+ПД' or $ExType = 'РИИ+ПД+ПДОСС'">IV. </xsl:when>
                            <xsl:otherwise>III. </xsl:otherwise>
                        </xsl:choose> Описание рассмотренной документации (материалов) </p>
                    <br/>

                    <!-- Вывод описания результатов инженерных изысканий -->
                    <xsl:if test="$ExType = 'РИИ' or $ExType = 'РИИ+ПД' or $ExType = 'РИИ+ПД+ПДОСС'">

                        <p class="title"> 4.1. Описание результатов инженерных изысканий </p>
                        <br/>

                        <!-- Вывод cведений о составе отчетных материалов о результатах инженерных изысканий -->
                        <p class="title">
                            <xsl:if test="ExaminationObject/ExaminationStage = 1"> 4.1.1. Состав отчетной документации о выполнении инженерных изысканий (с учетом изменений, внесенных в ходе проведения экспертизы)</xsl:if>
                            <xsl:if test="ExaminationObject/ExaminationStage = 2"> 4.1.1. Состав отчетной документации о выполнении инженерных изысканий (с учетом изменений, внесенных в ходе проведения повторной экспертизы)</xsl:if>
                            <xsl:if test="ExaminationObject/ExaminationStage = 3"> 4.1.1. Состав отчетной документации о выполнении инженерных изысканий</xsl:if>
                        </p>
                        <xsl:if test="Documents/Document[DocType &gt; '06.00' and DocType &lt; '07.00' and File]">
                            <table style="border-style: solid; border-width:1px; border-collapse: collapse; align: center; width: 100%;">
                                <tr>
                                    <td style="width: 5%; border-style: solid; border-width:1px; font-weight: bold; text-align: center;">№ п/п</td>
                                    <td style="width: 30%; border-style: solid; border-width:1px; font-weight: bold; text-align: center;">Имя файла</td>
                                    <td style="width: 10%; border-style: solid; border-width:1px; font-weight: bold; text-align: center;">Формат (тип) файла</td>
                                    <td style="width: 15%; border-style: solid; border-width:1px; font-weight: bold; text-align: center;">Контрольная сумма</td>
                                    <td style="width: 40%; border-style: solid; border-width:1px; font-weight: bold; text-align: center;">Примечание</td>
                                </tr>
                                <xsl:call-template name="EngineeringSurveysDocTable">
                                    <xsl:with-param name="Code" select="'06.01'"/>
                                </xsl:call-template>
                                <xsl:call-template name="EngineeringSurveysDocTable">
                                    <xsl:with-param name="Code" select="'06.02'"/>
                                </xsl:call-template>
                                <xsl:call-template name="EngineeringSurveysDocTable">
                                    <xsl:with-param name="Code" select="'06.03'"/>
                                </xsl:call-template>
                                <xsl:call-template name="EngineeringSurveysDocTable">
                                    <xsl:with-param name="Code" select="'06.04'"/>
                                </xsl:call-template>
                                <xsl:call-template name="EngineeringSurveysDocTable">
                                    <xsl:with-param name="Code" select="'06.05'"/>
                                </xsl:call-template>
                                <xsl:call-template name="EngineeringSurveysDocTable">
                                    <xsl:with-param name="Code" select="'06.06'"/>
                                </xsl:call-template>
                                <xsl:call-template name="EngineeringSurveysDocTable">
                                    <xsl:with-param name="Code" select="'06.07'"/>
                                </xsl:call-template>
                                <xsl:call-template name="EngineeringSurveysDocTable">
                                    <xsl:with-param name="Code" select="'06.08'"/>
                                </xsl:call-template>
                                <xsl:call-template name="EngineeringSurveysDocTable">
                                    <xsl:with-param name="Code" select="'06.09'"/>
                                </xsl:call-template>
                                <xsl:call-template name="EngineeringSurveysDocTable">
                                    <xsl:with-param name="Code" select="'06.10'"/>
                                </xsl:call-template>
                                <xsl:call-template name="EngineeringSurveysDocTable">
                                    <xsl:with-param name="Code" select="'06.11'"/>
                                </xsl:call-template>
                                <xsl:call-template name="EngineeringSurveysDocTable">
                                    <xsl:with-param name="Code" select="'06.99'"/>
                                </xsl:call-template>
                            </table>
                        </xsl:if>
                        <xsl:if test="not(Documents/Document[DocType &gt; '06.00' and DocType &lt; '07.00' and File])">
                            <p>Документы не представлены.</p>
                        </xsl:if>
                        <br/>

                    </xsl:if>

                    <!-- Вывод сведний о проектной документации -->
                    <xsl:if test="not($ExType = 'РИИ')">
                        <xsl:if test="not($ExType = 'ПД' and ExaminationObject/ExaminationStage = 3)">
                            <p class="title">
                                <xsl:choose>
                                    <xsl:when test="($ExType = 'ПД' or $ExType = 'ПД+ПДОСС' or $ExType = 'ПДОСС') and ExaminationObject/ExaminationStage != 3">3.1. </xsl:when>
                                    <xsl:when test="$ExType = 'ПД+ПДОСС' and ExaminationObject/ExaminationStage = 3">3.1. </xsl:when>
                                    <xsl:otherwise>4.2. </xsl:otherwise>
                                </xsl:choose> Описание технической части проектной документации </p>
                        </xsl:if>

                        <!-- Вывод сведний о проектной документации -->
                        <p class="title">
                            <xsl:choose>
                                <xsl:when test="ExaminationObject/ExaminationStage = 3 and $ExType = 'ПД'">3.1. </xsl:when>
                                <xsl:when test="ExaminationObject/ExaminationStage = 3 and $ExType = 'ПД+ПДОСС'">3.1.1. </xsl:when>
                                <xsl:when test="ExaminationObject/ExaminationStage != 3 and ($ExType = 'ПД' or $ExType = 'ПД+ПДОСС' or $ExType = 'ПДОСС')">3.1.1. </xsl:when>
                                <xsl:otherwise>4.2.1. </xsl:otherwise>
                            </xsl:choose> Состав проектной документации (с учетом изменений, внесенных в ходе проведения экспертизы) </p>
                        <xsl:if test="Documents/Document[((DocType &gt; '07.00' and DocType &lt; '09.00') or (DocType &gt; '13.00' and DocType &lt; '14.00') or (DocType &gt; '25.00' and DocType &lt; '26.00')) and File]">
                            <table style="border-style: solid; border-width:1px; border-collapse: collapse; align: center; width: 100%;">
                                <tr>
                                    <td style="width: 5%; border-style: solid; border-width:1px; font-weight: bold; text-align: center;">№ п/п</td>
                                    <td style="width: 30%; border-style: solid; border-width:1px; font-weight: bold;text-align: center;">Имя файла</td>
                                    <td style="width: 10%; border-style: solid; border-width:1px; font-weight: bold;text-align: center;">Формат (тип) файла</td>
                                    <td style="width: 15%; border-style: solid; border-width:1px; font-weight: bold;text-align: center;">Контрольная сумма</td>
                                    <td style="width: 40%; border-style: solid; border-width:1px; font-weight: bold;text-align: center;">Примечание</td>
                                </tr>

                                <xsl:if test="Documents/Document[DocType &gt; '07.00' and DocType &lt; '07.20' and File] and not(Documents/Document[DocType &gt; '07.19' and DocType &lt; '08.00'])">

                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.01'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.02'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.03'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.04'"/>
                                    </xsl:call-template>
                                    <xsl:if test="Documents/Document[DocType &gt; '07.04' and DocType &lt; '07.12' and File]">
                                        <tr>
                                            <td colspan="5">
                                                <p class="title"> Сведения об инженерном оборудовании, о сетях инженерно-технического обеспечения, перечень инженерно-технических мероприятий, содержание технологических решений </p>
                                            </td>
                                        </tr>
                                    </xsl:if>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.05'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.06'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.07'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.08'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.09'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.10'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.11'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.12'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.13'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.14'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.15'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.16'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.17'"/>
                                    </xsl:call-template>

                                </xsl:if>

                                <xsl:if test="not(Documents/Document[DocType &gt; '07.00' and DocType &lt; '07.20']) and Documents/Document[DocType &gt; '07.19' and DocType &lt; '08.00' and File]">

                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.20'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.21'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.22'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.23'"/>
                                    </xsl:call-template>
                                    <xsl:if test="Documents/Document[DocType &gt; '07.23' and DocType &lt; '07.30' and File]">
                                        <tr>
                                            <td colspan="5">
                                                <p class="title"> Сведения об инженерном оборудовании, о сетях и системах инженерно-технического обеспечения </p>
                                            </td>
                                        </tr>
                                    </xsl:if>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.24'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.25'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.26'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.27'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.28'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.29'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.30'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.31'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.32'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.33'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.34'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'07.35'"/>
                                    </xsl:call-template>
                                    
                                </xsl:if>

                                <xsl:if test="Documents/Document[DocType &gt; '08.00' and DocType &lt; '08.11' and File] and not(Documents/Document[DocType &gt; '08.10' and DocType &lt; '09.00'])">

                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'08.01'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'08.02'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'08.03'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'08.04'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'08.05'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'08.06'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'08.07'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'08.08'"/>
                                    </xsl:call-template>

                                </xsl:if>

                                <xsl:if test="not(Documents/Document[DocType &gt; '08.00' and DocType &lt; '08.11']) and Documents/Document[DocType &gt; '08.10' and DocType &lt; '09.00' and File]">

                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'08.11'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'08.12'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'08.13'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'08.14'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'08.15'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'08.16'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'08.17'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'08.18'"/>
                                    </xsl:call-template>

                                </xsl:if>

                                <xsl:if test="Documents/Document[(DocType &gt; '25.00' and DocType &lt; '26.00') or (DocType = '11.05') or (DocType = '11.06') and File]">
                                    <tr>
                                        <td colspan="5">
                                            <p class="title">
                                                
                                                <xsl:if test="/Conclusion/Object/Type!=3 and Documents/Document[DocType &gt; '07.00' and DocType &lt; '07.20' and File]">
                                                    Смета на строительство объектов капитального строительства
                                                </xsl:if>  
                                                
                                                <xsl:if test="/Conclusion/Object/Type!=3 and Documents/Document[DocType &gt; '07.19' and DocType &lt; '08.00' and File]">
                                                    Смета на строительство, реконструкцию, капитальный ремонт, снос объекта капитального строительства
                                                </xsl:if> 
                                                
                                                <xsl:if test="/Conclusion/Object/Type=3 and Documents/Document[DocType &gt; '08.00' and DocType &lt; '08.11' and File]">
                                                    Смета на строительство
                                                </xsl:if>  
                                                
                                                <xsl:if test="/Conclusion/Object/Type=3 and Documents/Document[DocType &gt; '08.10' and DocType &lt; '09.00' and File]">
                                                    Смета на строительство, реконструкцию, капитальный ремонт, снос объекта капитального строительства
                                                </xsl:if> 
                                
                                <xsl:if test="not(Documents/Document[DocType &gt; '07.00' and DocType &lt; '09.00']) and Documents/Document[(DocType &gt; '25.00' and DocType &lt; '26.00') or (DocType = '11.05') or (DocType = '11.06') and File]">

                                                <!-- до -->
                                                <xsl:if test="Documents/Document[number(translate(DocDate, '-', '')) &lt; 20220901 and DocType = '05.03']">

                                                    <xsl:if test="/Conclusion/Object/Type = 3">Смета на строительство</xsl:if>

                                                    <xsl:if test="/Conclusion/Object/Type != 3">Смета на строительство объектов капитального строительства</xsl:if>

                                                </xsl:if>
                                                <!-- после -->
                                                <xsl:if test="not(Documents/Document[number(translate(DocDate, '-', '')) &lt; 20220901 and DocType = '05.03'])">Смета на строительство, реконструкцию, капитальный ремонт, снос объекта капитального строительства</xsl:if>
                                     </xsl:if>
                                            </p>
                                        </td>
                                    </tr>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'25.01'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'25.02'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'25.03'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'25.04'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'25.05'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'25.06'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'11.05'"/>
                                    </xsl:call-template>
                                    <xsl:call-template name="ProjectDocumentsDocTable">
                                        <xsl:with-param name="Code" select="'11.06'"/>
                                    </xsl:call-template>

                                </xsl:if>
                        
                        <xsl:call-template name="ProjectDocumentsDocTable">
                            <xsl:with-param name="Code" select="'07.19'"/>
                        </xsl:call-template>
                        
                        <xsl:call-template name="ProjectDocumentsDocTable">
                            <xsl:with-param name="Code" select="'07.37'"/>
                        </xsl:call-template>
                        
                        
                        <xsl:call-template name="ProjectDocumentsDocTable">
                            <xsl:with-param name="Code" select="'08.10'"/>
                        </xsl:call-template>
                        
                        
                        <xsl:call-template name="ProjectDocumentsDocTable">
                            <xsl:with-param name="Code" select="'08.20'"/>
                        </xsl:call-template>
                        
                        <xsl:call-template name="ProjectDocumentsDocTable">
                            <xsl:with-param name="Code" select="'13.01'"/>
                        </xsl:call-template>
                        <xsl:call-template name="ProjectDocumentsDocTable">
                            <xsl:with-param name="Code" select="'13.02'"/>
                        </xsl:call-template>
                        
                            </table>
                        </xsl:if>
                        <xsl:if test="not(Documents/Document[((DocType &gt; '07.00' and DocType &lt; '09.00') or (DocType &gt; '13.00' and DocType &lt; '14.00') or (DocType &gt; '25.00' and DocType &lt; '26.00')) and File])">
                            <p>Документы не представлены.</p>
                        </xsl:if>
                        <br/>

                        <xsl:if test="ExpertProjectDocuments[DangerSolutions]">
                            <p> В ходе проведения государственной экспертизы были приведены в соответствие с установленными требованиями следующие решения, которые в случае их реализации могли привести к риску возникновения аварийных ситуаций, гибели людей, причинения значительного материального ущерба: </p>
                            <xsl:for-each select="ExpertProjectDocuments[DangerSolutions]">
                                <p class="title"> В части <xsl:text> </xsl:text>
                                    <xsl:call-template name="MakeExpertTypeTitle">
                                        <xsl:with-param name="ExpertType" select="@ExpertType"/>
                                    </xsl:call-template>
                                </p>
                                <p>
                                    <xsl:call-template name="StringReplace">
                                        <xsl:with-param name="input" select="DangerSolutions"/>
                                    </xsl:call-template>
                                </p>
                                <br/>
                            </xsl:for-each>

                        </xsl:if>


                        <!-- Вывод сведений о сметной стоимости  -->
                        <xsl:if test="not($ExType = 'РИИ') and EstimatedCost">
                            <p class="title">
                                <xsl:choose>
                                    <!--                                    <xsl:when test="ExaminationObject/ExaminationStage = 3 and $ExType = 'ПД'">3.3. </xsl:when>
                                    <xsl:when test="ExaminationObject/ExaminationStage = 3 and $ExType = 'ПД+ПДОСС'">3.2. </xsl:when>-->
                                    <xsl:when test="$ExType = 'ПД' or $ExType = 'ПД+ПДОСС' or $ExType = 'ПДОСС'">3.2. </xsl:when>
                                    <xsl:when test="$ExType = 'РИИ+ПД' or $ExType = 'РИИ+ПД+ПДОСС'">4.3. </xsl:when>
                                </xsl:choose> Описание сметы на строительство (реконструкцию, капитальный ремонт, снос) объектов капитального строительства, проведение работ по сохранению объектов культурного наследия (памятников истории и культуры) народов Российской Федерации </p>
                            <br/>

                            <!-- Вывод сведения о сметной стоимости строительства -->
                            <p class="title">
                                <xsl:choose>
                                    <xsl:when test="$ExType = 'ПД' or $ExType = 'ПД+ПДОСС' or $ExType = 'ПДОСС'">

                                        <xsl:if test="ExaminationObject/ExaminationStage = 1"> 3.2.1. Сведения о сметной стоимости строительства, реконструкции, капитального ремонта, сноса объекта капитального строительства, работ по сохранению объектов культурного наследия (памятников истории и культуры) народов Российской Федерации на дату представления сметной документации для проведения проверки достоверности определения сметной стоимости и на дату утверждения заключения экспертизы</xsl:if>
                                        <xsl:if test="ExaminationObject/ExaminationStage = 2"> 3.2.1. Сведения о сметной стоимости строительства, реконструкции, капитального ремонта, сноса объекта капитального строительства, работ по сохранению объектов культурного наследия (памятников истории и культуры) народов Российской Федерации на дату представления сметной документации для проведения проверки достоверности определения сметной стоимости и на дату утверждения заключения повторной экспертизы</xsl:if>
                                        <xsl:if test="ExaminationObject/ExaminationStage = 3"> 3.2.1. Сведения о сметной стоимости строительства, реконструкции, капитального ремонта, сноса объекта капитального строительства, работ по сохранению объектов культурного наследия (памятников истории и культуры) народов Российской Федерации на дату представления сметной документации для проведения проверки достоверности определения сметной стоимости и на дату утверждения заключения экспертизы по результатам экспертного сопровождения </xsl:if>
                                    </xsl:when>

                                    <xsl:when test="$ExType = 'РИИ+ПД' or $ExType = 'РИИ+ПД+ПДОСС'">
                                        <xsl:if test="ExaminationObject/ExaminationStage = 1"> 4.3.1. Сведения о сметной стоимости строительства, реконструкции, капитального ремонта, сноса объекта капитального строительства, работ по сохранению объектов культурного наследия (памятников истории и культуры) народов Российской Федерации на дату представления сметной документации для проведения проверки достоверности определения сметной стоимости и на дату утверждения заключения экспертизы</xsl:if>
                                        <xsl:if test="ExaminationObject/ExaminationStage = 2"> 4.3.1. Сведения о сметной стоимости строительства, реконструкции, капитального ремонта, сноса объекта капитального строительства, работ по сохранению объектов культурного наследия (памятников истории и культуры) народов Российской Федерации на дату представления сметной документации для проведения проверки достоверности определения сметной стоимости и на дату утверждения заключения повторной экспертизы</xsl:if>
                                        <xsl:if test="ExaminationObject/ExaminationStage = 3"> 4.3.1. Сведения о сметной стоимости строительства, реконструкции, капитального ремонта, сноса объекта капитального строительства, работ по сохранению объектов культурного наследия (памятников истории и культуры) народов Российской Федерации на дату представления сметной документации для проведения проверки достоверности определения сметной стоимости и на дату утверждения заключения экспертизы по результатам экспертного сопровождения</xsl:if>
                                    </xsl:when>
                                </xsl:choose>
                            </p>
                            <xsl:apply-templates select="EstimatedCost"/>
                            <br/>


                            <xsl:if test="$ExType = 'ПД+ПДОСС' or $ExType = 'ПДОСС' or $ExType = 'РИИ+ПД+ПДОСС'">

                                <!-- Вывод сведения об использовании сметных нормативах-->
                                <p class="title">
                                    <xsl:choose>
                                        <xsl:when test="$ExType = 'ПД+ПДОСС' or $ExType = 'ПДОСС'">3.2.2. </xsl:when>
                                        <xsl:when test="$ExType = 'РИИ+ПД+ПДОСС'">4.3.2. </xsl:when>
                                    </xsl:choose> Информация об использованных сметных нормативах </p>
                                <xsl:for-each select="ExpertEstimate[EstimateNorms != '']">
                                    <br/>
                                    <p>
                                        <xsl:call-template name="StringReplace">
                                            <xsl:with-param name="input" select="EstimateNorms"/>
                                        </xsl:call-template>
                                    </p>
                                </xsl:for-each>
                                <br/>
                            </xsl:if>
                        </xsl:if>

                    </xsl:if>

                    <!-- Вывод сведения о выводах по результатам рассмотрения -->

                    <!-- Вывод заголовка четвертого (если ПД или ПДОСС) или пятого (если РИИ) раздела  -->
                    <p class="title">
                        <xsl:choose>
                            <xsl:when test="$ExType = 'РИИ' or $ExType = 'РИИ+ПД' or $ExType = 'РИИ+ПД+ПДОСС'">V. </xsl:when>
                            <xsl:otherwise>IV. </xsl:otherwise>
                        </xsl:choose> Выводы по результатам рассмотрения </p>
                    <br/>

                    <!-- Вывод сведения о соответствии или несоответствии результатов инженерных изысканий требованиям технических регламентов -->
                    <xsl:if test="$ExType = 'РИИ' or $ExType = 'РИИ+ПД' or $ExType = 'РИИ+ПД+ПДОСС'">
                        <p class="title">5.1. Выводы о соответствии или несоответствии результатов инженерных изысканий требованиям технических регламентов </p>
                        <xsl:if test="ExpertEngineeringSurveys/Mismatches">
                            <!-- Вывод таблицы с замечаниями -->
                            <table>
                                <tr>
                                    <td style="width: 10%; vertical-align: middle;">
                                        <p class="center">№ п/п</p>
                                    </td>
                                    <td style="width: 50%; vertical-align: middle;">
                                        <p class="center">Выводы о несоответствии</p>
                                    </td>
                                    <td style="width: 20%; vertical-align: middle;">
                                        <p class="center">Ссылка на материалы</p>
                                    </td>
                                    <td style="width: 20%; vertical-align: middle;">
                                        <p class="center">Основание</p>
                                    </td>
                                </tr>
                                <xsl:for-each select="ExpertEngineeringSurveys[Mismatches]">
                                    <xsl:sort select="@EngineeringSurveyType"/>
                                    <tr>
                                        <td style="width: 100%;" colspan="4">
                                            <p class="title">5.1.<xsl:number value="position()" format="1. "/>
                                                <xsl:call-template name="MakeRII">
                                                    <xsl:with-param name="TypeCode" select="@EngineeringSurveyType"/>
                                                </xsl:call-template>
                                            </p>
                                        </td>
                                    </tr>
                                    <xsl:for-each select="Mismatches/NormsMismatch">
                                        <tr>
                                            <td>
                                                <p class="center">
                                                    <xsl:number value="position()" format="1. "/>
                                                </p>
                                            </td>
                                            <td>
                                                <p class="left no-first-line">
                                                    <xsl:value-of select="Summary"/>
                                                </p>
                                            </td>
                                            <td>
                                                <p class="left no-first-line">
                                                    <xsl:value-of select="Part"/>
                                                </p>
                                            </td>
                                            <td>
                                                <p class="left no-first-line">
                                                    <xsl:value-of select="Link"/>
                                                </p>
                                            </td>
                                        </tr>
                                    </xsl:for-each>
                                </xsl:for-each>
                            </table>
                        </xsl:if>
                        <p>
                            <xsl:value-of select="Summary/EngineeringSurveySummary"/>
                        </p>

                        <xsl:if test="Summary/EngineeringSurveySummaryDate and Summary/EngineeringSurveySummaryDate!=''">
                                <xsl:call-template name="StringReplace">
                                    <xsl:with-param name="input" select="concat('Сведения о дате, по состоянию на которую действовали требования, указанные в части 5 статьи 49 Градостроительного кодекса Российской Федерации, примененные в соответствии с частью 5.2 статьи 49 Градостроительного кодекса Российской Федерации: ',Summary/EngineeringSurveySummaryDate)"/>
                                </xsl:call-template>
                        </xsl:if>
                        <br/>
                    </xsl:if>

                    <!-- Вывод сведения о выводах в отношении технической части проектной документации -->
                    <xsl:if test="not($ExType = 'РИИ') and not($ExType = 'ПДОСС')">

                        <p class="title">
                            <xsl:choose>
                                <xsl:when test="$ExType = 'ПД+ПДОСС'">4.1. </xsl:when>
                                <xsl:when test="$ExType = 'ПД' or $ExType = 'ПД+ПДОСС'">4.1. </xsl:when>
                                <xsl:when test="$ExType = 'РИИ+ПД' or $ExType = 'РИИ+ПД+ПДОСС'">5.2.</xsl:when>
                            </xsl:choose> Выводы в отношении технической части проектной документации </p>
                        <br/>

                        <!-- Вывод сведения о результатах инженерных изысканий, на соответствие которым проводилась оценка проектной документации -->
                        <p class="title">
                            <xsl:choose>
                                <!--<xsl:when test="$ExType = 'ПД'">4.1. </xsl:when>-->
                                <xsl:when test="$ExType = 'ПД' or $ExType = 'ПД+ПДОСС'">4.1.1. </xsl:when>
                                <xsl:when test="$ExType = 'РИИ+ПД' or $ExType = 'РИИ+ПД+ПДОСС'">5.2.1. </xsl:when>
                            </xsl:choose> Указание на результаты инженерных изысканий, на соответствие которым проводилась оценка проектной документации </p>
                        <br/>
                        <xsl:if test="Summary/EngineeringSurveyType">
                            <p> Оценка проектной документации проведена на соответствие результатам следующих инженерных изысканий: </p>
                            <xsl:for-each select="Summary/EngineeringSurveyType">
                                <p>
                                    <xsl:text>- </xsl:text>
                                    <xsl:call-template name="MakeRII">
                                        <xsl:with-param name="TypeCode" select="."/>
                                    </xsl:call-template>
                                    <xsl:if test="position() != last()">;</xsl:if>
                                    <xsl:if test="position() = last()">.</xsl:if>
                                </p>
                            </xsl:for-each>
                        </xsl:if>
                        <xsl:if test="not(Summary/EngineeringSurveyType)">
                            <p> Оценка проектной документации на соответствие результатам инженерных изысканий не проводилась. </p>
                        </xsl:if>
                        <br/>


                        <!-- Вывод о соответсвии или несоответствии технической части проектной документации результатам инженерных изысканий, заданию застройщика или технического заказчика на проектирование и требованиям технических регламентов и о совместимости или несовместимости с частью проектной документации и (или) результатами инженерных изысканий, в которые изменения не вносились< -->
                        <p class="title">
                            <xsl:choose>
                                <xsl:when test="ExaminationObject/ExaminationStage = 1 and ($ExType = 'ПД' or $ExType = 'ПД+ПДОСС')"> 4.1.2. Выводы о соответствии или несоответствии технической части проектной документации результатам инженерных изысканий, заданию застройщика или технического заказчика на проектирование и требованиям технических регламентов</xsl:when>
                                <xsl:when test="ExaminationObject/ExaminationStage != 1 and ($ExType = 'ПД' or $ExType = 'ПД+ПДОСС')"> 4.1.2. Выводы о соответствии или несоответствии технической части проектной документации результатам инженерных изысканий, заданию застройщика или технического заказчика на проектирование и требованиям технических регламентов и о совместимости или несовместимости с частью проектной документации и (или) результатами инженерных изысканий, в которые изменения не вносились</xsl:when>
                                <xsl:when test="ExaminationObject/ExaminationStage = 1 and ($ExType = 'РИИ+ПД' or $ExType = 'РИИ+ПД+ПДОСС')"> 5.2.2. Выводы о соответствии или несоответствии технической части проектной документации результатам инженерных изысканий, заданию застройщика или технического заказчика на проектирование и требованиям технических регламентов</xsl:when>
                                <xsl:when test="ExaminationObject/ExaminationStage != 1 and ($ExType = 'РИИ+ПД' or $ExType = 'РИИ+ПД+ПДОСС')"> 5.2.2. Выводы о соответствии или несоответствии технической части проектной документации результатам инженерных изысканий, заданию застройщика или технического заказчика на проектирование и требованиям технических регламентов и о совместимости или несовместимости с частью проектной документации и (или) результатами инженерных изысканий, в которые изменения не вносились</xsl:when>
                            </xsl:choose>
                        </p>
                        <xsl:if test="ExpertProjectDocuments/Mismatches">
                            <!-- Вывод таблицы с замечаниями -->
                            <table>
                                <tr>
                                    <td style="width: 10%; vertical-align: middle;">
                                        <p class="center">№ п/п</p>
                                    </td>
                                    <td style="width: 50%; vertical-align: middle;">
                                        <p class="center">Выводы о несоответствии</p>
                                    </td>
                                    <td style="width: 20%; vertical-align: middle;">
                                        <p class="center">Ссылка на материалы</p>
                                    </td>
                                    <td style="width: 20%; vertical-align: middle;">
                                        <p class="center">Основание</p>
                                    </td>
                                </tr>
                                <xsl:for-each select="ExpertProjectDocuments[Mismatches]">
                                    <tr>
                                        <td style="width: 100%;" colspan="4">
                                            <p class="title">
                                                <xsl:choose>
                                                    <xsl:when test="$ExType = 'ПДОСС' or $ExType = 'ПД+ПДОСС' or $ExType = 'ПД'">4.1.2.</xsl:when>
                                                    <xsl:when test="$ExType = 'РИИ+ПД' or $ExType = 'РИИ+ПД+ПДОСС'">5.2.2.</xsl:when>
                                                </xsl:choose>
                                                <xsl:number value="position()" format="1. "/>В части <xsl:call-template name="MakeExpertTypeTitle">
                                                    <xsl:with-param name="ExpertType" select="@ExpertType"/>
                                                </xsl:call-template>
                                            </p>
                                        </td>
                                    </tr>
                                    <xsl:for-each select="Mismatches/EngineeringSurveyMismatch | Mismatches/ProjectTaskMismatch | Mismatches/NormsMismatch">
                                        <tr>
                                            <td>
                                                <p class="center">
                                                    <xsl:number value="position()" format="1. "/>
                                                </p>
                                            </td>
                                            <td>
                                                <p class="left no-first-line">
                                                    <xsl:value-of select="Summary"/>
                                                </p>
                                            </td>
                                            <td>
                                                <p class="left no-first-line">
                                                    <xsl:value-of select="Part"/>
                                                </p>
                                            </td>
                                            <td>
                                                <p class="left no-first-line">
                                                    <xsl:value-of select="Link"/>
                                                </p>
                                            </td>
                                        </tr>
                                    </xsl:for-each>
                                </xsl:for-each>
                            </table>
                        </xsl:if>
                        <p>
                            <xsl:value-of select="Summary/ProjectDocumentsSummary"/>
                        </p>
                        <xsl:if test="Summary/ProjectDocumentsSummaryDate and Summary/ProjectDocumentsSummaryDate!=''">
                                <xsl:call-template name="StringReplace">
                                    <xsl:with-param name="input" select="concat('Сведения о дате, по состоянию на которую действовали требования, указанные в части 5 статьи 49 Градостроительного кодекса Российской Федерации, примененные в соответствии с частью 5.2 статьи 49 Градостроительного кодекса Российской Федерации: ',Summary/ProjectDocumentsSummaryDate)"/>
                                </xsl:call-template>
                        </xsl:if>
                        <br/>

                        <xsl:if test="ExpertProjectDocuments/Mismatches[DangerMismatch]">
                            <p> Следующие решения, предусмотренные в проектной документации, в случае их реализации могут привести к риску возникновения аварийных ситуаций, гибели людей, причинения значительного материального ущерба: </p>
                            <xsl:for-each select="ExpertProjectDocuments[Mismatches/DangerMismatch]">
                                <p class="title"> В части <xsl:text> </xsl:text>
                                    <xsl:call-template name="MakeExpertTypeTitle">
                                        <xsl:with-param name="ExpertType" select="@ExpertType"/>
                                    </xsl:call-template>
                                </p>
                                <p>
                                    <xsl:call-template name="StringReplace">
                                        <xsl:with-param name="input" select="Mismatches/DangerMismatch"/>
                                    </xsl:call-template>
                                </p>
                                <br/>
                            </xsl:for-each>

                        </xsl:if>
                        <br/>
                    </xsl:if>

                    <!-- Вывод сведения о выводах по результатам проверки достоверности определения сметной стоимости -->
                    <xsl:if test="$ExType = 'ПДОСС' or $ExType = 'ПД+ПДОСС' or $ExType = 'РИИ+ПД+ПДОСС'">

                        <p class="title">
                            <xsl:choose>
                                <xsl:when test="$ExType = 'РИИ+ПД+ПДОСС'">5.3. </xsl:when>
                                <xsl:when test="$ExType = 'ПДОСС'">4.1. </xsl:when>
                                <xsl:when test="$ExType = 'ПД+ПДОСС'">4.2. </xsl:when>
                            </xsl:choose> Выводы по результатам проверки достоверности определения сметной стоимости </p>
                        <br/>

                        <!--              <xsl:if test="ExaminationObject/ConstructionType != 3"> -->
                        <xsl:if test="$SummaryType = 1">
                            <p class="title">
                                <xsl:choose>
                                    <xsl:when test="$ExType = 'РИИ+ПД+ПДОСС'">5.3.1. </xsl:when>
                                    <xsl:when test="$ExType = 'ПДОСС'">4.1.1. </xsl:when>
                                    <xsl:when test="$ExType = 'ПД+ПДОСС'">4.2.1. </xsl:when>
                                </xsl:choose> Выводы о соответствии (несоответствии) расчетов, содержащихся в сметной документации, утвержденным сметным нормативам, сведения о которых включены в федеральный реестр сметных нормативов, физическим объемам работ, конструктивным, организационно-технологическим и другим решениям, предусмотренным проектной документацией </p>


                            <xsl:if test="ExpertEstimate/Mismatches">
                                <!-- Вывод таблицы с замечаниями -->
                                <table>
                                    <tr>
                                        <td style="width: 10%; vertical-align: middle;">
                                            <p class="center">№ п/п</p>
                                        </td>
                                        <td style="width: 50%; vertical-align: middle;">
                                            <p class="center">Выводы о несоответствии</p>
                                        </td>
                                        <td style="width: 20%; vertical-align: middle;">
                                            <p class="center">Ссылка на материалы</p>
                                        </td>
                                        <td style="width: 20%; vertical-align: middle;">
                                            <p class="center">Основание</p>
                                        </td>
                                    </tr>

                                    <!-- Проверка есть ли общие замечания-->
                                    <xsl:if test="ExpertEstimate[Mismatches[CommonMismatch]]">
                                        <tr>
                                            <td style="width: 100%;" colspan="4">
                                                <p class="title">Общие замечания</p>
                                            </td>
                                        </tr>
                                        <xsl:for-each select="ExpertEstimate/Mismatches/CommonMismatch">
                                            <tr>
                                                <td>
                                                    <p class="center">
                                                        <xsl:number value="position()" format="1. "/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Summary"/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Part"/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Link"/>
                                                    </p>
                                                </td>
                                            </tr>
                                        </xsl:for-each>
                                    </xsl:if>

                                    <!-- Проверка есть ли замечания к сводному сметному расчету -->
                                    <xsl:if test="ExpertEstimate[Mismatches[FullCalculationMismatch]]">
                                        <tr>
                                            <td style="width: 100%;" colspan="4">
                                                <p class="title"> Замечания по сводному сметному расчету </p>
                                            </td>
                                        </tr>
                                        <xsl:for-each select="ExpertEstimate/Mismatches/FullCalculationMismatch">
                                            <tr>
                                                <td>
                                                    <p class="center">
                                                        <xsl:number value="position()" format="1. "/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Summary"/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Part"/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Link"/>
                                                    </p>
                                                </td>
                                            </tr>
                                        </xsl:for-each>
                                    </xsl:if>

                                    <!-- Проверка есть ли замечания к объектному или локальному сметному расчету -->
                                    <xsl:if test="ExpertEstimate[Mismatches[LocalCalculationMismatch]]">
                                        <tr>
                                            <td style="width: 100%;" colspan="4">
                                                <p class="title"> Замечания по объектным и локальным сметным расчетам </p>
                                            </td>
                                        </tr>
                                        <xsl:for-each select="ExpertEstimate/Mismatches/LocalCalculationMismatch">
                                            <tr>
                                                <td>
                                                    <p class="center">
                                                        <xsl:number value="position()" format="1. "/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Summary"/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Part"/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Link"/>
                                                    </p>
                                                </td>
                                            </tr>
                                        </xsl:for-each>
                                    </xsl:if>

                                    <xsl:if test="ExpertEstimate/Mismatches/ProjectDocumentsMismatch">
                                        <tr>
                                            <td style="width: 100%;" colspan="4">
                                                <p class="title"> Замечания в части соответствия расчетов, содержащихся в сметной документации, физическим объемам работ, конструктивным, организационно-технологическим и другим решениям, предусмотренным проектной документацией </p>
                                            </td>
                                        </tr>


                                        <!-- Проверка есть ли замечания в части соответствия расчетов, содержащихся в сметной документации, физическим объемам работ, конструктивным, организационно-технологическим и другим решениям, предусмотренным проектной документацией -->
                                        <xsl:if test="ExpertEstimate/Mismatches/ProjectDocumentsMismatch[@ExpertType = '35.1.' or @ExpertType = '17.1.' or @ExpertType = '955.15.']">

                                            <xsl:for-each select="ExpertEstimate/Mismatches/ProjectDocumentsMismatch[@ExpertType = '35.1.' or @ExpertType = '17.1.' or @ExpertType = '955.15.']">
                                                <tr>
                                                    <td>
                                                        <p class="center">
                                                            <xsl:number value="position()" format="1. "/>
                                                        </p>
                                                    </td>
                                                    <td>
                                                        <p class="left no-first-line">
                                                            <xsl:value-of select="Summary"/>
                                                        </p>
                                                    </td>
                                                    <td>
                                                        <p class="left no-first-line">
                                                            <xsl:value-of select="Part"/>
                                                        </p>
                                                    </td>
                                                    <td>
                                                        <p class="left no-first-line">
                                                            <xsl:value-of select="Link"/>
                                                        </p>
                                                    </td>
                                                </tr>
                                            </xsl:for-each>
                                        </xsl:if>

                                        <!-- Проверка есть ли замечания (по направлениям дейтельности) в части соответствия расчетов, содержащихся в сметной документации, физическим объемам работ, конструктивным, организационно-технологическим и другим решениям, предусмотренным проектной документацией -->
                                        <xsl:if test="ExpertEstimate/Mismatches/ProjectDocumentsMismatch[@ExpertType != '35.1.' and @ExpertType != '17.1.' and @ExpertType != '955.15.']">
                                            <xsl:for-each select="ExpertEstimate/Mismatches/ProjectDocumentsMismatch[@ExpertType != '35.1.' and @ExpertType != '17.1.' and @ExpertType != '955.15.']">
                                                <xsl:sort select="."/>
                                                <xsl:if test="not(preceding-sibling::ProjectDocumentsMismatch/@ExpertType = ./@ExpertType)">
                                                    <tr>
                                                        <td style="width: 100%;" colspan="4">
                                                            <p class="title"> В части <xsl:text> </xsl:text>
                                                                <xsl:call-template name="MakeExpertTypeTitle">
                                                                    <xsl:with-param name="ExpertType" select="./@ExpertType"/>
                                                                </xsl:call-template>
                                                            </p>
                                                        </td>
                                                    </tr>

                                                    <xsl:call-template name="MakeProjectDocumentsMismatch">
                                                        <xsl:with-param name="ExpertType" select="./@ExpertType"/>
                                                    </xsl:call-template>
                                                </xsl:if>

                                            </xsl:for-each>
                                        </xsl:if>

                                    </xsl:if>

                                    <!-- Проверка есть ли замечания в части пересчета из базисных цен в текущие -->
                                    <xsl:if test="ExpertEstimate[Mismatches[BasicMismatch]]">
                                        <tr>
                                            <td style="width: 100%;" colspan="4">
                                                <p class="title"> Замечания по порядку пересчета сметной стоимости из базисного уровня цен в текущий уровень цен </p>
                                            </td>
                                        </tr>
                                        <xsl:for-each select="ExpertEstimate/Mismatches/BasicMismatch">
                                            <tr>
                                                <td>
                                                    <p class="center">
                                                        <xsl:number value="position()" format="1. "/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Summary"/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Part"/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Link"/>
                                                    </p>
                                                </td>
                                            </tr>
                                        </xsl:for-each>
                                    </xsl:if>
                                </table>
                            </xsl:if>
                        </xsl:if>

                        <!--        <xsl:if test="ExaminationObject/ConstructionType = 3"> -->
                        <xsl:if test="$SummaryType = 2">
                            <p class="title">
                                <xsl:choose>
                                    <xsl:when test="$ExType = 'РИИ+ПД+ПДОСС'">5.3.1. </xsl:when>
                                    <xsl:when test="$ExType = 'ПДОСС'">4.1.1. </xsl:when>
                                    <xsl:when test="$ExType = 'ПД+ПДОСС'">4.2.1. </xsl:when>
                                </xsl:choose> Выводы о соответствии (несоответствии) расчетов, содержащихся в сметной документации, физическим объемам работ, включенным в ведомость объемов работ, акт, утвержденный застройщиком или техническим заказчиком и содержащий перечень дефектов оснований, строительных конструкций, систем инженерно-технического обеспечения и сетей инженерно-технического обеспечения с указанием качественных и количественных характеристик таких дефектов, при проведении проверки достоверности определения сметной стоимости капитального ремонта </p>

                            <xsl:if test="ExpertEstimate/Mismatches">
                                <!-- Вывод таблицы с замечаниями -->
                                <table>
                                    <tr>
                                        <td style="width: 10%; vertical-align: middle;">
                                            <p class="center">№ п/п</p>
                                        </td>
                                        <td style="width: 50%; vertical-align: middle;">
                                            <p class="center">Выводы о несоответствии</p>
                                        </td>
                                        <td style="width: 20%; vertical-align: middle;">
                                            <p class="center">Ссылка на материалы</p>
                                        </td>
                                        <td style="width: 20%; vertical-align: middle;">
                                            <p class="center">Основание</p>
                                        </td>
                                    </tr>

                                    <!-- Проверка есть ли общие замечания-->
                                    <xsl:if test="ExpertEstimate[Mismatches[CommonMismatch]]">
                                        <tr>
                                            <td style="width: 100%;" colspan="4">
                                                <p class="title">Общие замечания</p>
                                            </td>
                                        </tr>
                                        <xsl:for-each select="ExpertEstimate/Mismatches/CommonMismatch">
                                            <tr>
                                                <td>
                                                    <p class="center">
                                                        <xsl:number value="position()" format="1. "/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Summary"/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Part"/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Link"/>
                                                    </p>
                                                </td>
                                            </tr>
                                        </xsl:for-each>
                                    </xsl:if>

                                    <!-- Проверка есть ли замечания к сводному сметному расчету -->
                                    <xsl:if test="ExpertEstimate[Mismatches[FullCalculationMismatch]]">
                                        <tr>
                                            <td style="width: 100%;" colspan="4">
                                                <p class="title">Замечания по сводному сметному расчету</p>
                                            </td>
                                        </tr>
                                        <xsl:for-each select="ExpertEstimate/Mismatches/FullCalculationMismatch">
                                            <tr>
                                                <td>
                                                    <p class="center">
                                                        <xsl:number value="position()" format="1. "/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Summary"/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Part"/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Link"/>
                                                    </p>
                                                </td>
                                            </tr>
                                        </xsl:for-each>
                                    </xsl:if>

                                    <!-- Проверка есть ли замечания к объектному или локальному сметному расчету -->
                                    <xsl:if test="ExpertEstimate[Mismatches[LocalCalculationMismatch]]">
                                        <tr>
                                            <td style="width: 100%;" colspan="4">
                                                <p class="title"> Замечания по объектным и локальным сметным расчетам </p>
                                            </td>
                                        </tr>
                                        <xsl:for-each select="ExpertEstimate/Mismatches/LocalCalculationMismatch">
                                            <tr>
                                                <td>
                                                    <p class="center">
                                                        <xsl:number value="position()" format="1. "/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Summary"/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Part"/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Link"/>
                                                    </p>
                                                </td>
                                            </tr>
                                        </xsl:for-each>
                                    </xsl:if>

                                    <!-- Проверка есть ли замечания в части соответствия расчетов, содержащихся в сметной документации, физическим объемам работ, конструктивным, организационно-технологическим и другим решениям, предусмотренным проектной документацией -->
                                    <xsl:if test="ExpertEstimate[Mismatches[ProjectDocumentsMismatch]]">
                                        <tr>
                                            <td style="width: 100%;" colspan="4">
                                                <p class="title"> Замечания в части соответствия расчетов, содержащихся в сметной документации, физическим объемам работ, включенным в ведомость объемов работ, акт, утвержденный застройщиком или техническим заказчиком </p>
                                            </td>
                                        </tr>
                                        <xsl:for-each select="ExpertEstimate/Mismatches/ProjectDocumentsMismatch">
                                            <tr>
                                                <td>
                                                    <p class="center">
                                                        <xsl:number value="position()" format="1. "/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Summary"/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Part"/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Link"/>
                                                    </p>
                                                </td>
                                            </tr>
                                        </xsl:for-each>
                                    </xsl:if>

                                    <!-- Проверка есть ли замечания в части пересчета из базисных цен в текущие -->
                                    <xsl:if test="ExpertEstimate[Mismatches[BasicMismatch]]">
                                        <tr>
                                            <td style="width: 100%;" colspan="4">
                                                <p class="title"> Замечания по порядку пересчета сметной стоимости из базисного уровня цен в текущий уровень цен </p>
                                            </td>
                                        </tr>
                                        <xsl:for-each select="ExpertEstimate/Mismatches/BasicMismatch">
                                            <tr>
                                                <td>
                                                    <p class="center">
                                                        <xsl:number value="position()" format="1. "/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Summary"/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Part"/>
                                                    </p>
                                                </td>
                                                <td>
                                                    <p class="left no-first-line">
                                                        <xsl:value-of select="Link"/>
                                                    </p>
                                                </td>
                                            </tr>
                                        </xsl:for-each>
                                    </xsl:if>
                                </table>
                            </xsl:if>
                        </xsl:if>
                        <p>
                            <xsl:value-of select="Summary/EstimateNormsAndWorksSummary"/>
                            <xsl:value-of select="Summary/EstimateNormsAndWorksSummary1315"/>
                        </p>
                        <br/>

                        <p class="title">
                            <xsl:choose>
                                <xsl:when test="$ExType = 'РИИ+ПД+ПДОСС'">5.3.2. </xsl:when>
                                <xsl:when test="$ExType = 'ПДОСС'">4.1.2. </xsl:when>
                                <xsl:when test="$ExType = 'ПД+ПДОСС'">4.2.2. </xsl:when>
                            </xsl:choose> Вывод о достоверности или недостоверности определения сметной стоимости строительства, реконструкции, капитального ремонта, сноса объекта капитального строительства, работ по сохранению объектов культурного наследия (памятников истории и культуры) народов Российской Федерации </p>
                        <p>
                            <xsl:value-of select="Summary/EstimateSummary"/>
                            <xsl:value-of select="Summary/EstimateSummary1315"/>
                        </p>
                        <br/>
                    </xsl:if>

                    <!-- Общие выводы -->
                    <p class="title">
                        <xsl:choose>
                            <xsl:when test="$ExType = 'РИИ' or $ExType = 'РИИ+ПД' or $ExType = 'РИИ+ПД+ПДОСС'">VI. </xsl:when>
                            <xsl:otherwise>V. </xsl:otherwise>
                        </xsl:choose> Общие выводы </p>

                    <xsl:if test="Summary/ExaminationSummary/EngineeringSurveysResultsSummary and ExaminationObject/ExaminationType=1">
                        <p>
                            <xsl:value-of select="Summary/ExaminationSummary/EngineeringSurveysResultsSummary"/>
                        </p>
                    </xsl:if>
                    <xsl:if test="Summary/ExaminationSummary/ProjectDocumentsSummary and ExaminationObject/ExaminationType=2">
                        <p>Проектная документация:</p>
                        <p>    
                            <xsl:if test="Summary/ExaminationSummary/ProjectDocumentsSummary/ProjectDocumentationEngineeringSurveysResultsSummary='Проектная документация соответствует результатам инженерных изысканий.'">- соответствует результатам инженерных изысканий;</xsl:if>
                            <xsl:if test="Summary/ExaminationSummary/ProjectDocumentsSummary/ProjectDocumentationEngineeringSurveysResultsSummary='Проектная документация не соответствует результатам инженерных изысканий.'">- не соответствует результатам инженерных изысканий;</xsl:if>
                        </p>
                        <p>
                            <xsl:if test="Summary/ExaminationSummary/ProjectDocumentsSummary/ProjectDocumentationDesignAssignmentSummary='Проектная документация соответствует заданию на проектирование.'">- соответствует заданию на проектирование;</xsl:if>
                            <xsl:if test="Summary/ExaminationSummary/ProjectDocumentsSummary/ProjectDocumentationDesignAssignmentSummary='Проектная документация не соответствует заданию на проектирование.'">- не соответствует заданию на проектирование;</xsl:if>
                        </p>
                        <p>
                            <xsl:if test="Summary/ExaminationSummary/ProjectDocumentsSummary/ProjectDocumentationTechnicalRequirementsSummary='Проектная документация соответствует требованиям технических регламентов и иным установленным требованиям.'">- соответствует требованиям технических регламентов и иным установленным требованиям.</xsl:if>
                            <xsl:if test="Summary/ExaminationSummary/ProjectDocumentsSummary/ProjectDocumentationTechnicalRequirementsSummary='Проектная документация не соответствует требованиям технических регламентов и иным установленным требованиям.'">- не соответствует требованиям технических регламентов и иным установленным требованиям.</xsl:if>
                        </p>
                        </xsl:if>

                    <xsl:if test="(Summary/ExaminationSummary/EstimateSummary or Summary/ExaminationSummary/EstimateSummary1315) and ExaminationObject/ExaminationType=3">
                        <p>
                            <xsl:value-of select="Summary/ExaminationSummary/EstimateSummary"/>
                            <xsl:value-of select="Summary/ExaminationSummary/EstimateSummary1315"/>
                        </p>
                    </xsl:if>

                    <br/>
                    <!-- Сведения о лицах, аттестованных на право подготовки заключений экспертизы, подписавших заключение экспертизы -->
                    <p class="title">
                        <xsl:choose>
                            <xsl:when test="$ExType = 'РИИ' or $ExType = 'РИИ+ПД' or $ExType = 'РИИ+ПД+ПДОСС'">VII. </xsl:when>
                            <xsl:otherwise>VI. </xsl:otherwise>
                        </xsl:choose> Сведения о лицах, аттестованных на право подготовки заключений экспертизы, подписавших заключение экспертизы </p>
                    <xsl:apply-templates select="Experts/Expert"/>

                </div>
            </body>
        </html>

    </xsl:template>

    <!-- Конец основного шаблона -->


    <!-- Вывод сведений о документе и его авторе -->
    <xsl:template match="Document">
        <xsl:value-of select="DocName"/>
        <xsl:choose>
            <xsl:when test="DocChanges != ''"> (<xsl:value-of select="DocChanges"/>) </xsl:when>
        </xsl:choose>
        <xsl:if test="DocDate">
            <xsl:if test="DocDate != ''">
                <xsl:text> от </xsl:text>
                <xsl:call-template name="formatdate">
                    <xsl:with-param name="DateTimeStr" select="DocDate"/>
                </xsl:call-template>
            </xsl:if>
        </xsl:if>
        <xsl:if test="DocNumber">
            <xsl:if test="DocNumber != ''">
                <xsl:text> № </xsl:text>
                <xsl:value-of select="DocNumber"/>
            </xsl:if>
        </xsl:if>
        <xsl:if test="DocIssueAuthor">
            <xsl:if test="DocIssueAuthor != ''">, <xsl:value-of select="DocIssueAuthor"/>
            </xsl:if>
        </xsl:if>

        <xsl:if test="FullDocIssueAuthor">
            <!--            <xsl:if test="FullDocIssueAuthor != ''">,
-->
            <xsl:for-each select="FullDocIssueAuthor">
                <xsl:text>, </xsl:text>
                <xsl:if test="Organization">
                    <xsl:value-of select="Organization/OrgFullName"/>
                </xsl:if>
                <xsl:if test="ForeignOrganization">
                    <xsl:value-of select="ForeignOrganization/OrgFullName"/>
                </xsl:if>
                <xsl:if test="IP">
                    <xsl:value-of select="IP/FamilyName"/>
                    <xsl:text disable-output-escaping="yes"><![CDATA[ ]]></xsl:text>
                    <xsl:value-of select="IP/FirstName"/>
                    <xsl:text disable-output-escaping="yes"><![CDATA[ ]]></xsl:text>
                    <xsl:value-of select="IP/SecondName"/>
                </xsl:if>
                <xsl:if test="FullDocIssueAuthor/Person">
                    <xsl:value-of select="Person/FamilyName"/>
                    <xsl:text disable-output-escaping="yes"><![CDATA[ ]]></xsl:text>
                    <xsl:value-of select="Person/FirstName"/>
                    <xsl:text disable-output-escaping="yes"><![CDATA[ ]]></xsl:text>
                    <xsl:value-of select="PersonPerson/SecondName"/>
                </xsl:if>
            </xsl:for-each>
            <!--</xsl:if>-->
        </xsl:if>
    </xsl:template>

    <!-- Вывод сведений о документе и его авторе -->
    <xsl:template match="PreviousConclusion">
        <xsl:if test="Result = 1">Положительное</xsl:if>
        <xsl:if test="Result = 2">Отрицательное</xsl:if>
        <xsl:text> заключение экспертизы </xsl:text>
        <xsl:if test="ExaminationObjectType = 1">
            <xsl:text> результатов инженерных изысканий </xsl:text>
        </xsl:if>
        <xsl:if test="ExaminationObjectType = 2">
            <xsl:text> проектной документации </xsl:text>
        </xsl:if>
        <xsl:if test="ExaminationObjectType = 3">
            <xsl:text> проектной документации и результатов инженерных изысканий </xsl:text>
        </xsl:if>
        <xsl:text>по объекту "</xsl:text>
        <xsl:value-of select="Name"/>
        <xsl:text>" </xsl:text>
        <xsl:text> от </xsl:text>
        <xsl:call-template name="formatdate">
            <xsl:with-param name="DateTimeStr" select="Date"/>
        </xsl:call-template>
        <xsl:text> № </xsl:text>
        <xsl:value-of select="Number"/>
    </xsl:template>

    <xsl:template match="PreviousSimpleConclusion">
		<xsl:if test="Result = 1">Положительное </xsl:if>
        <xsl:if test="Result = 2">Отрицательное </xsl:if>
        <xsl:text>заключение по результатам оценки соответствия</xsl:text>
		<xsl:if test="ExaminationObjectType = 1">
            <xsl:text> результатов инженерных изысканий </xsl:text>
        </xsl:if>
        <xsl:if test="ExaminationObjectType = 2">
            <xsl:text> проектной документации </xsl:text>
        </xsl:if>
        <xsl:if test="ExaminationObjectType = 3">
            <xsl:text> проектной документации и результатов инженерных изысканий </xsl:text>
        </xsl:if>
		<xsl:text>в рамках экспертного сопровождения от </xsl:text>
        <xsl:call-template name="formatdate">
            <xsl:with-param name="DateTimeStr" select="Date"/>
        </xsl:call-template>
        <xsl:text> № </xsl:text>
        <xsl:value-of select="Number"/>
    </xsl:template>

    <xsl:template name="TableDocument">
        <xsl:variable name="FileNumber">
            <xsl:if test="IULFile"><xsl:value-of select="count(IULFile)+ count(IULFile/SignFile) +1+ count(File) + count(File/SignFile)"/></xsl:if>
            <xsl:if test="not(IULFile)"><xsl:value-of select="count(File) + count(File/SignFile)"/></xsl:if>
        </xsl:variable>
        <xsl:variable name="IULNumber" select="count(IULFile)"/>
        <xsl:variable name="Pos" select="position()"/>
        <xsl:for-each select="File">
            <tr>
                <xsl:if test="position() = 1">
                    <td>
                        <xsl:if test="$FileNumber != 1">
                            <xsl:attribute name="rowspan">
                                <xsl:value-of select="$FileNumber"/>
                            </xsl:attribute>
                        </xsl:if>
                        <xsl:value-of select="$Pos"/>
                    </td>
                </xsl:if>
                <td class="longline_break">
                    <xsl:value-of select="FileName"/>
                </td>
                <td>
                    <xsl:value-of select="FileFormat"/>
                </td>
                <td class="center">
                    <xsl:value-of select="FileChecksum"/>
                </td>
                <xsl:if test="position() = 1">
                    <td>
                        <xsl:if test="$FileNumber != 1">
                            <xsl:attribute name="rowspan">
                                <xsl:value-of select="$FileNumber"/>
                            </xsl:attribute>
                        </xsl:if>
                        <xsl:if test="../DocNumber != ''">
                            <xsl:value-of select="../DocNumber"/>
                        </xsl:if>
                        <xsl:if test="../DocDate != ''">
                            <xsl:text> от </xsl:text>
                            <xsl:call-template name="formatdate">
                                <xsl:with-param name="DateTimeStr" select="../DocDate"/>
                            </xsl:call-template>
                        </xsl:if>
                        <xsl:if test="../DocNumber != '' or ../DocDate != null">
                            <br/>
                        </xsl:if>
                        <xsl:if test="../DocName != ''">
                            <xsl:value-of select="../DocName"/>
                        </xsl:if>
                    </td>
                </xsl:if>
            </tr>
            <xsl:for-each select="SignFile">
                <tr>
                    <td style="font-style: italic;" class="longline_break">
                        <xsl:value-of select="FileName"/>
                    </td>
                    <td style="font-style: italic;">
                        <xsl:value-of select="FileFormat"/>
                    </td>
                    <td class="center" style="font-style: italic;">
                        <xsl:value-of select="FileChecksum"/>
                    </td>
                </tr>
            </xsl:for-each>
        </xsl:for-each>
            
            <xsl:for-each select="IULFile">
                <xsl:if test="position() = 1">
                    <tr>
                        <td colspan="3">
                            <xsl:if test="$IULNumber=1">Информационный удостоверяющий лист:</xsl:if>
                            <xsl:if test="$IULNumber!=1">Информационные удостоверяющие листы:</xsl:if>
                        </td>
                    </tr>
                </xsl:if>
                <tr>
                    <td class="longline_break">
                        <xsl:value-of select="FileName"/>
                    </td>
                    <td>
                        <xsl:value-of select="FileFormat"/>
                    </td>
                    <td class="center">
                        <xsl:value-of select="FileChecksum"/>
                    </td>
                </tr>
                <xsl:for-each select="SignFile">
                    <tr>
                        <td style="font-style: italic;" class="longline_break">
                            <xsl:value-of select="FileName"/>
                        </td>
                        <td style="font-style: italic;">
                            <xsl:value-of select="FileFormat"/>
                        </td>
                        <td class="center" style="font-style: italic;">
                            <xsl:value-of select="FileChecksum"/>
                        </td>
                    </tr>
                </xsl:for-each>
            </xsl:for-each>
            
    </xsl:template>


    <xsl:template match="Address | PostAddress">

        <!--  Если в адресе есть неформализованное описание адреса выводится оно, если нет, то формируется строка из составных частей -->
        <!-- Вывод почтового адрес (если есть поле PostIndex) -->
        <xsl:if test="position() != 1">; </xsl:if>
        <xsl:if test="PostIndex">
            <xsl:if test="PostIndex">
                <xsl:value-of select="PostIndex"/>, </xsl:if>
        </xsl:if>
        <xsl:if test="Country">
            <xsl:value-of select="Country"/>
            <xsl:if test="Region != '00' or District or City or Settlement or Street or Building or Room or Note">, </xsl:if>
        </xsl:if>
        <xsl:if test="Region != '00'">
            <xsl:call-template name="MakeRegion">
                <xsl:with-param name="Code" select="Region"/>
            </xsl:call-template>
            <xsl:if test="District or City or Settlement or Street or Building or Room or Note">, </xsl:if>
        </xsl:if>
        <xsl:if test="District">
            <xsl:value-of select="District"/>
            <xsl:if test="City or Settlement or Street or Building or Room or Note">, </xsl:if>
        </xsl:if>
        <xsl:if test="City">
            <xsl:value-of select="City"/>
            <xsl:if test="Settlement or Street or Building or Room or Note">, </xsl:if>
        </xsl:if>
        <xsl:if test="Settlement">
            <xsl:value-of select="Settlement"/>
            <xsl:if test="Street or Building or Room or Note">, </xsl:if>
        </xsl:if>
        <xsl:if test="Street">
            <xsl:value-of select="Street"/>
            <xsl:if test="Building or Room or Note">, </xsl:if>
        </xsl:if>
        <xsl:if test="Building">
            <xsl:value-of select="Building"/>
            <xsl:if test="Room or Note">, </xsl:if>
        </xsl:if>
        <xsl:if test="Room">
            <xsl:value-of select="Room"/>
            <xsl:if test="Note">, </xsl:if>
        </xsl:if>
        <xsl:if test="Note">
            <xsl:value-of select="Note"/>
        </xsl:if>

    </xsl:template>

    <!-- Вывод сведений об эксперте -->
    <xsl:template match="Expert">
        <p class="organization">
            <xsl:number value="position()" format="1) "/>
            <xsl:value-of select="FamilyName"/>
            <xsl:text disable-output-escaping="yes"><![CDATA[ ]]></xsl:text>
            <xsl:value-of select="FirstName"/>
            <xsl:text disable-output-escaping="yes"><![CDATA[ ]]></xsl:text>
            <xsl:value-of select="SecondName"/>
        </p>
        <p class="expert">
            <xsl:if test="ExpertType">
                <xsl:if test="ExpertType != ''"> Направление деятельности: <xsl:call-template name="MakeExpertType">
                        <xsl:with-param name="Code" select="ExpertType"/>
                    </xsl:call-template>
                    <br/>
                </xsl:if>
            </xsl:if>
            <xsl:if test="ExpertCertificate">
                <xsl:if test="ExpertCertificate != ''"> Номер квалификационного аттестата: <xsl:value-of select="ExpertCertificate"/>
                    <br/> Дата выдачи квалификационного аттестата:<xsl:text> </xsl:text>
                    <xsl:call-template name="formatdate">
                        <xsl:with-param name="DateTimeStr" select="ExpertCertificateBeginDate"/>
                    </xsl:call-template>
                    <br/> Дата окончания срока действия квалификационного аттестата:<xsl:text> </xsl:text>
                    <xsl:call-template name="formatdate">
                        <xsl:with-param name="DateTimeStr" select="ExpertCertificateEndDate"/>
                    </xsl:call-template><br/>
                    <br/>
                </xsl:if>
            </xsl:if>
        </p>
        <br/>
    </xsl:template>

    <!-- Вывод технико-экономическом показателе -->
    <xsl:template match="TEI">
        <tr>
            <td>
                <xsl:value-of select="Name"/>
            </td>
            <td class="center">
                <xsl:value-of select="Measure"/>
            </td>
            <td class="center">
                <xsl:value-of select="Value"/>
            </td>
        </tr>
    </xsl:template>

    <!-- Вывод сведений о юридическом лице -->
    <xsl:template match="Organization | ExpertOrganization">
        <span class="field">Наименование: </span>
        <xsl:value-of select="OrgFullName"/>
        <br/>
        <span class="field">ОГРН: </span>
        <xsl:value-of select="OrgOGRN"/>
        <br/>
        <span class="field">ИНН: </span>
        <xsl:value-of select="OrgINN"/>
        <br/>
        <span class="field">КПП: </span>
        <xsl:value-of select="OrgKPP"/>
        <br/>
        <xsl:if test="Email">
            <xsl:if test="Email != ''">
                <span class="field">Адрес электронной почты: </span>
                <xsl:value-of select="Email"/>
                <br/>
            </xsl:if>
        </xsl:if>
        <span class="field">Место нахождения и адрес: </span>
        <xsl:apply-templates select="Address"/>
    </xsl:template>

    <!-- Вывод сведений об иностранном юридическом лице -->
    <xsl:template match="ForeignOrganization">
        <span class="field">Наименование: </span>
        <xsl:value-of select="OrgFullName"/>
        <br/>
        <span class="field">ИНН: </span>
        <xsl:value-of select="OrgINN"/>
        <br/>
        <span class="field">КПП: </span>
        <xsl:value-of select="OrgKPP"/>
        <br/>
        <xsl:if test="Email">
            <xsl:if test="Email != ''">
                <span class="field">Адрес электронной почты: </span>
                <xsl:value-of select="Email"/>
                <br/>
            </xsl:if>
        </xsl:if>
        <span class="field">Адрес: </span>
        <xsl:if test="Address">
            <xsl:apply-templates select="Address"/>
        </xsl:if>

    </xsl:template>

    <!-- Вывод сведений об индивидуальном предпринимателе -->
    <xsl:template match="IP">
        <span class="field">Индивидуальный предприниматель: </span>
        <xsl:value-of select="FamilyName"/>
        <xsl:text> </xsl:text>
        <xsl:value-of select="FirstName"/>
        <xsl:text> </xsl:text>
        <xsl:value-of select="SecondName"/>
        <br/>
        <span class="field">ОГРНИП: </span>
        <xsl:value-of select="OGRNIP"/>
        <br/>
        <xsl:if test="Email">
            <xsl:if test="Email != ''">
                <span class="field">Адрес электронной почты: </span>
                <xsl:value-of select="Email"/>

                <br/>
            </xsl:if>
        </xsl:if>
        <span class="field">Адрес: </span>
        <xsl:apply-templates select="PostAddress"/>
    </xsl:template>

    <!-- Вывод сведений о физическом лице-->
    <xsl:template match="Person">
        <span class="field">ФИО: </span>
        <xsl:value-of select="FamilyName"/>
        <xsl:text> </xsl:text>
        <xsl:value-of select="FirstName"/>
        <xsl:text> </xsl:text>
        <xsl:value-of select="SecondName"/>
        <br/>
        <span class="field">СНИЛС: </span>
        <xsl:value-of select="SNILS"/>
        <br/>
        <xsl:if test="Email">
            <xsl:if test="Email != ''">
                <span class="field">Адрес электронной почты: </span>
                <xsl:value-of select="Email"/>
                <br/>
            </xsl:if>
        </xsl:if>
        <span class="field">Адрес: </span>
        <xsl:apply-templates select="PostAddress"/>
    </xsl:template>

    <!-- Вывод наименования инженерных изысканий -->
    <xsl:template name="MakeRII">
        <xsl:param name="TypeCode"/>
        <xsl:if test="$TypeCode = '06.01' or $TypeCode = 1">Инженерно-геодезические изыскания</xsl:if>
        <xsl:if test="$TypeCode = '06.02' or $TypeCode = 2">Инженерно-геологические изыскания</xsl:if>
        <xsl:if test="$TypeCode = '06.03' or $TypeCode = 3">Инженерно-гидрометеорологические изыскания</xsl:if>
        <xsl:if test="$TypeCode = '06.04' or $TypeCode = 4">Инженерно-экологические изыскания</xsl:if>
        <xsl:if test="$TypeCode = '06.05' or $TypeCode = 5">Инженерно-геотехнические изыскания</xsl:if>
        <xsl:if test="$TypeCode = '06.06' or $TypeCode = 6">Геотехнические исследования</xsl:if>
        <xsl:if test="$TypeCode = '06.07' or $TypeCode = 7">Обследования состояния грунтов оснований зданий и сооружений, их строительных конструкций</xsl:if>
        <xsl:if test="$TypeCode = '06.08' or $TypeCode = 8">Поиск и разведка подземных вод для целей водоснабжения</xsl:if>
        <xsl:if test="$TypeCode = '06.09' or $TypeCode = 9">Локальный мониторинг компонентов окружающей среды</xsl:if>
        <xsl:if test="$TypeCode = '06.10' or $TypeCode = 10">Разведка грунтовых строительных материалов</xsl:if>
        <xsl:if test="$TypeCode = '06.11' or $TypeCode = 11">Локальные обследования загрязнения грунтов и грунтовых вод</xsl:if>
    </xsl:template>

    <!-- Вывод наименования разделов проектной документации -->
    <xsl:template name="MakeProjectSection">
        <xsl:param name="Code"/>
        <xsl:if test="$Code = '07.01'">Пояснительная записка</xsl:if>
        <xsl:if test="$Code = '07.02'">Схема планировочной организации земельного участка</xsl:if>
        <xsl:if test="$Code = '07.03'">Архитектурные решения</xsl:if>
        <xsl:if test="$Code = '07.04'">Конструктивные и объемно-планировочные решения</xsl:if>
        <xsl:if test="$Code = '07.05'">Система электроснабжения</xsl:if>
        <xsl:if test="$Code = '07.06'">Система водоснабжения</xsl:if>
        <xsl:if test="$Code = '07.07'">Система водоотведения</xsl:if>
        <xsl:if test="$Code = '07.08'">Отопление, вентиляция и кондиционирование воздуха, тепловые сети</xsl:if>
        <xsl:if test="$Code = '07.09'">Сети связи</xsl:if>
        <xsl:if test="$Code = '07.10'">Система газоснабжения</xsl:if>
        <xsl:if test="$Code = '07.11'">Технологические решения</xsl:if>
        <xsl:if test="$Code = '07.12'">Проект организации строительства</xsl:if>
        <xsl:if test="$Code = '07.13'">Проект организации работ по сносу или демонтажу объектов капитального строительства</xsl:if>
        <xsl:if test="$Code = '07.14'">Перечень мероприятий по охране окружающей среды</xsl:if>
        <xsl:if test="$Code = '07.15'">Мероприятия по обеспечению пожарной безопасности</xsl:if>
        <xsl:if test="$Code = '07.16'">Мероприятия по обеспечению доступа инвалидов</xsl:if>
        <xsl:if test="$Code = '07.17'">Мероприятия по обеспечению соблюдения требований энергетической эффективности и требований оснащенности зданий, строений и сооружений приборами учета используемых энергетических ресурсов</xsl:if>
        <xsl:if test="$Code = '07.19'">Иная документация в случаях, предусмотренных федеральными законами</xsl:if>

        <xsl:if test="$Code = '07.20'">Пояснительная записка</xsl:if>
        <xsl:if test="$Code = '07.21'">Схема планировочной организации земельного участка</xsl:if>
        <xsl:if test="$Code = '07.22'">Объемно-планировочные и архитектурные решения</xsl:if>
        <xsl:if test="$Code = '07.23'">Конструктивные решения</xsl:if>
        <xsl:if test="$Code = '07.24'">Система электроснабжения</xsl:if>
        <xsl:if test="$Code = '07.25'">Система водоснабжения</xsl:if>
        <xsl:if test="$Code = '07.26'">Система водоотведения</xsl:if>
        <xsl:if test="$Code = '07.27'">Отопление, вентиляция и кондиционирование воздуха, тепловые сети</xsl:if>
        <xsl:if test="$Code = '07.28'">Сети связи</xsl:if>
        <xsl:if test="$Code = '07.29'">Система газоснабжения</xsl:if>
        <xsl:if test="$Code = '07.30'">Технологические решения</xsl:if>
        <xsl:if test="$Code = '07.31'">Проект организации строительства</xsl:if>
        <xsl:if test="$Code = '07.32'">Мероприятия по охране окружающей среды</xsl:if>
        <xsl:if test="$Code = '07.33'">Мероприятия по обеспечению пожарной безопасности</xsl:if>
        <xsl:if test="$Code = '07.34'">Требования к обеспечению безопасной эксплуатации объектов капитального строительства</xsl:if>
        <xsl:if test="$Code = '07.35'">Мероприятия по обеспечению доступа инвалидов к объекту капитального строительства</xsl:if>
        <xsl:if test="$Code = '07.37'">Иная документация в случаях, предусмотренных законодательными и иными нормативными правовыми актами Российской Федерации</xsl:if>

        <xsl:if test="$Code = '08.01'">Пояснительная записка</xsl:if>
        <xsl:if test="$Code = '08.02'">Проект полосы отвода</xsl:if>
        <xsl:if test="$Code = '08.03'">Технологические и конструктивные решения линейного объекта. Искусственные сооружения.</xsl:if>
        <xsl:if test="$Code = '08.04'">Здания, строения и сооружения, входящие в инфраструктуру линейного объекта.</xsl:if>
        <xsl:if test="$Code = '08.05'">Проект организации строительства</xsl:if>
        <xsl:if test="$Code = '08.06'">Проект организации работ по сносу (демонтажу) линейного объекта</xsl:if>
        <xsl:if test="$Code = '08.07'">Мероприятия по охране окружающей среды</xsl:if>
        <xsl:if test="$Code = '08.08'">Мероприятия по обеспечению пожарной безопасности</xsl:if>
        <xsl:if test="$Code = '08.10'">Иная документация в случаях, предусмотренных федеральными законами</xsl:if>

        <xsl:if test="$Code = '08.11'">Пояснительная записка</xsl:if>
        <xsl:if test="$Code = '08.12'">Проект полосы отвода</xsl:if>
        <xsl:if test="$Code = '08.13'">Технологические и конструктивные решения линейного объекта. Искусственные сооружения.</xsl:if>
        <xsl:if test="$Code = '08.14'">Здания, строения и сооружения, входящие в инфраструктуру линейного объекта.</xsl:if>
        <xsl:if test="$Code = '08.15'">Проект организации строительства</xsl:if>
        <xsl:if test="$Code = '08.16'">Мероприятия по охране окружающей среды</xsl:if>
        <xsl:if test="$Code = '08.17'">Мероприятия по обеспечению пожарной безопасности</xsl:if>
        <xsl:if test="$Code = '08.18'">Требования к обеспечению безопасной эксплуатации линейного объекта</xsl:if>
        <xsl:if test="$Code = '08.20'">Иная документация в случаях, предусмотренных законодательными и иными нормативными правовыми актами Российской Федерации</xsl:if>

        <xsl:if test="$Code = '13.01'">Проект организации работ по сносу объекта капитального строительства</xsl:if>
        <xsl:if test="$Code = '13.02'">Смета на снос объекта капитального строительства</xsl:if>

        <xsl:if test="$Code = '25.01'">Пояснительная записка к сметной документации</xsl:if>
        <xsl:if test="$Code = '25.02'">Сводка затрат</xsl:if>
        <xsl:if test="$Code = '25.03'">Сводный сметный расчет</xsl:if>
        <xsl:if test="$Code = '25.04'">Объектный сметный расчет</xsl:if>
        <xsl:if test="$Code = '25.05'">Локальный сметный расчет</xsl:if>
        <xsl:if test="$Code = '25.06'">Сметные расчеты на отдельные виды затрат</xsl:if>

        <xsl:if test="$Code = '11.05'">Конъюнктурный анализ</xsl:if>
        <xsl:if test="$Code = '11.06'">Прайс-листы</xsl:if>

    </xsl:template>

    <!-- Вывод даты в формате ДД.ММ.ГГГГ-->
    <xsl:template name="formatdate">
        <xsl:param name="DateTimeStr"/>

        <xsl:if test="$DateTimeStr != ''">
            <xsl:variable name="mm">
                <xsl:value-of select="substring($DateTimeStr, 9, 2)"/>
            </xsl:variable>

            <xsl:variable name="dd">
                <xsl:value-of select="substring($DateTimeStr, 6, 2)"/>
            </xsl:variable>

            <xsl:variable name="yyyy">
                <xsl:value-of select="substring($DateTimeStr, 1, 4)"/>
            </xsl:variable>

            <xsl:value-of select="concat($mm, '.', $dd, '.', $yyyy)"/>
        </xsl:if>
    </xsl:template>

    <!-- Вывод заголовка экспертизы -->
    <xsl:template name="MakeTitle">
        <xsl:param name="Result"/>
        <xsl:param name="Form"/>
        <xsl:param name="Stage"/>
        <xsl:choose>
            <xsl:when test="$Result = 1"> Положительное </xsl:when>
            <xsl:when test="$Result = 2"> Отрицательное </xsl:when>
        </xsl:choose> заключение <xsl:choose>
            <xsl:when test="$Stage = 2"> повторной </xsl:when>
        </xsl:choose>
        <xsl:choose>
            <xsl:when test="$Form = 1"> государственной </xsl:when>
            <xsl:when test="$Form = 2"> негосударственной </xsl:when>
        </xsl:choose> экспертизы <xsl:choose>
            <xsl:when test="$Stage = 3">
                <br/>по результатам экспертного сопровождения </xsl:when>
        </xsl:choose>
    </xsl:template>


    <!-- Вывод наименования субъекта Российской Федерации -->
    <xsl:template name="MakeRegion">
        <xsl:param name="Code"/>

        <xsl:choose>
            <xsl:when test="$Code = 1">Республика Адыгея (Адыгея)</xsl:when>
            <xsl:when test="$Code = 2">Республика Башкортостан</xsl:when>
            <xsl:when test="$Code = 3">Республика Бурятия</xsl:when>
            <xsl:when test="$Code = 4">Республика Алтай</xsl:when>
            <xsl:when test="$Code = 5">Республика Дагестан</xsl:when>
            <xsl:when test="$Code = 6">Республика Ингушетия</xsl:when>
            <xsl:when test="$Code = 7">Кабардино-Балкарская Республика</xsl:when>
            <xsl:when test="$Code = 8">Республика Калмыкия</xsl:when>
            <xsl:when test="$Code = 9">Карачаево-Черкесская Республика</xsl:when>
            <xsl:when test="$Code = 10">Республика Карелия</xsl:when>
            <xsl:when test="$Code = 11">Республика Коми</xsl:when>
            <xsl:when test="$Code = 12">Республика Марий Эл</xsl:when>
            <xsl:when test="$Code = 13">Республика Мордовия</xsl:when>
            <xsl:when test="$Code = 14">Республика Саха (Якутия)</xsl:when>
            <xsl:when test="$Code = 15">Республика Северная Осетия-Алания</xsl:when>
            <xsl:when test="$Code = 16">Республика Татарстан (Татарстан)</xsl:when>
            <xsl:when test="$Code = 17">Республика Тыва</xsl:when>
            <xsl:when test="$Code = 18">Удмуртская Республика</xsl:when>
            <xsl:when test="$Code = 19">Республика Хакасия</xsl:when>
            <xsl:when test="$Code = 20">Чеченская Республика</xsl:when>
            <xsl:when test="$Code = 21">Чувашская Республика-Чувашия</xsl:when>
            <xsl:when test="$Code = 22">Алтайский край</xsl:when>
            <xsl:when test="$Code = 23">Краснодарский край</xsl:when>
            <xsl:when test="$Code = 24">Красноярский край</xsl:when>
            <xsl:when test="$Code = 25">Приморский край</xsl:when>
            <xsl:when test="$Code = 26">Ставропольский край</xsl:when>
            <xsl:when test="$Code = 27">Хабаровский край</xsl:when>
            <xsl:when test="$Code = 28">Амурская область</xsl:when>
            <xsl:when test="$Code = 29">Архангельская область</xsl:when>
            <xsl:when test="$Code = 30">Астраханская область</xsl:when>
            <xsl:when test="$Code = 31">Белгородская область</xsl:when>
            <xsl:when test="$Code = 32">Брянская область</xsl:when>
            <xsl:when test="$Code = 33">Владимирская область</xsl:when>
            <xsl:when test="$Code = 34">Волгоградская область</xsl:when>
            <xsl:when test="$Code = 35">Вологодская область</xsl:when>
            <xsl:when test="$Code = 36">Воронежская область</xsl:when>
            <xsl:when test="$Code = 37">Ивановская область</xsl:when>
            <xsl:when test="$Code = 38">Иркутская область</xsl:when>
            <xsl:when test="$Code = 39">Калининградская область</xsl:when>
            <xsl:when test="$Code = 40">Калужская область</xsl:when>
            <xsl:when test="$Code = 41">Камчатский край</xsl:when>
            <xsl:when test="$Code = 42">Кемеровская область - Кузбасс</xsl:when>
            <xsl:when test="$Code = 43">Кировская область</xsl:when>
            <xsl:when test="$Code = 44">Костромская область</xsl:when>
            <xsl:when test="$Code = 45">Курганская область</xsl:when>
            <xsl:when test="$Code = 46">Курская область</xsl:when>
            <xsl:when test="$Code = 47">Ленинградская область</xsl:when>
            <xsl:when test="$Code = 48">Липецкая область</xsl:when>
            <xsl:when test="$Code = 49">Магаданская область</xsl:when>
            <xsl:when test="$Code = 50">Московская область</xsl:when>
            <xsl:when test="$Code = 51">Мурманская область</xsl:when>
            <xsl:when test="$Code = 52">Нижегородская область</xsl:when>
            <xsl:when test="$Code = 53">Новгородская область</xsl:when>
            <xsl:when test="$Code = 54">Новосибирская область</xsl:when>
            <xsl:when test="$Code = 55">Омская область</xsl:when>
            <xsl:when test="$Code = 56">Оренбургская область</xsl:when>
            <xsl:when test="$Code = 57">Орловская область</xsl:when>
            <xsl:when test="$Code = 58">Пензенская область</xsl:when>
            <xsl:when test="$Code = 59">Пермский край</xsl:when>
            <xsl:when test="$Code = 60">Псковская область</xsl:when>
            <xsl:when test="$Code = 61">Ростовская область</xsl:when>
            <xsl:when test="$Code = 62">Рязанская область</xsl:when>
            <xsl:when test="$Code = 63">Самарская область</xsl:when>
            <xsl:when test="$Code = 64">Саратовская область</xsl:when>
            <xsl:when test="$Code = 65">Сахалинская область</xsl:when>
            <xsl:when test="$Code = 66">Свердловская область</xsl:when>
            <xsl:when test="$Code = 67">Смоленская область</xsl:when>
            <xsl:when test="$Code = 68">Тамбовская область</xsl:when>
            <xsl:when test="$Code = 69">Тверская область</xsl:when>
            <xsl:when test="$Code = 70">Томская область</xsl:when>
            <xsl:when test="$Code = 71">Тульская область</xsl:when>
            <xsl:when test="$Code = 72">Тюменская область</xsl:when>
            <xsl:when test="$Code = 73">Ульяновская область</xsl:when>
            <xsl:when test="$Code = 74">Челябинская область</xsl:when>
            <xsl:when test="$Code = 75">Забайкальский край</xsl:when>
            <xsl:when test="$Code = 76">Ярославская область</xsl:when>
            <xsl:when test="$Code = 77">Москва</xsl:when>
            <xsl:when test="$Code = 78">Санкт-Петербург</xsl:when>
            <xsl:when test="$Code = 79">Еврейская автономная область</xsl:when>
            <xsl:when test="$Code = 83">Ненецкий автономный округ</xsl:when>
            <xsl:when test="$Code = 86">Ханты-Мансийский автономный округ - Югра</xsl:when>
            <xsl:when test="$Code = 87">Чукотский автономный округ</xsl:when>
            <xsl:when test="$Code = 89">Ямало-Ненецкий автономный округ</xsl:when>
            <xsl:when test="$Code = 91">Республика Крым</xsl:when>
            <xsl:when test="$Code = 92">Севастополь</xsl:when>
            <xsl:when test="$Code = 80">Донецкая Народная Республика</xsl:when>
            <xsl:when test="$Code = 81">Луганская Народная Республика</xsl:when>
            <xsl:when test="$Code = 84">Херсонская область</xsl:when>
            <xsl:when test="$Code = 85">Запорожская область</xsl:when>
        </xsl:choose>
    </xsl:template>


    <!-- Вывод направления деятельности эксперта -->
    <xsl:template name="MakeExpertType">
        <xsl:param name="Code"/>

        <xsl:choose>
            <xsl:when test="$Code = '1.1.'">1.1. Инженерно-геодезические изыскания</xsl:when>
            <xsl:when test="$Code = '1.2.'">1.2. Инженерно-геологические изыскания</xsl:when>
            <xsl:when test="$Code = '1.3.'">1.3. Инженерно-гидрометеорологические изыскания</xsl:when>
            <xsl:when test="$Code = '1.4.'">1.4. Инженерно-экологические изыскания</xsl:when>
            <xsl:when test="$Code = '1.5.'">1.5. Инженерно-геотехнические изыскания</xsl:when>
            <xsl:when test="$Code = '2.1.'">2.1. Объемно-планировочные, архитектурные и конструктивные решения, планировочная организация земельного участка, организация строительства</xsl:when>
            <xsl:when test="$Code = '2.1.1.'">2.1.1. Схемы планировочной организации земельных участков</xsl:when>
            <xsl:when test="$Code = '2.1.2.'">2.1.2. Объемно-планировочные и архитектурные решения</xsl:when>
            <xsl:when test="$Code = '2.1.3.'">2.1.3. Конструктивные решения</xsl:when>
            <xsl:when test="$Code = '2.1.4.'">2.1.4. Организация строительства</xsl:when>
            <xsl:when test="$Code = '2.2.'">2.2. Теплогазоснабжение, водоснабжение, водоотведение, канализация, вентиляция и кондиционирование</xsl:when>
            <xsl:when test="$Code = '2.2.1.'">2.2.1. Водоснабжение, водоотведение и канализация</xsl:when>
            <xsl:when test="$Code = '2.2.2.'">2.2.2. Теплоснабжение, вентиляция и кондиционирование</xsl:when>
            <xsl:when test="$Code = '2.2.3.'">2.2.3. Системы газоснабжения</xsl:when>
            <xsl:when test="$Code = '2.3.'">2.3. Электроснабжение, связь, сигнализация, системы автоматизации</xsl:when>
            <xsl:when test="$Code = '2.3.1.'">2.3.1. Электроснабжение и электропотребление</xsl:when>
            <xsl:when test="$Code = '2.3.2.'">2.3.2. Системы автоматизации, связи и сигнализации</xsl:when>
            <xsl:when test="$Code = '2.4.'">2.4. Охрана окружающей среды, санитарно-эпидемиологическая безопасность</xsl:when>
            <xsl:when test="$Code = '2.4.1.'">2.4.1. Охрана окружающей среды</xsl:when>
            <xsl:when test="$Code = '2.4.2.'">2.4.2. Санитарно-эпидемиологическая безопасность</xsl:when>
            <xsl:when test="$Code = '2.5.'">2.5. Пожарная безопасность</xsl:when>
            <xsl:when test="$Code = '3.1.'">3.1. Организация экспертизы проектной документации и (или) результатов инженерных изысканий </xsl:when>
            <xsl:when test="$Code = '4.1.'">4.1. Мосты и трубы</xsl:when>
            <xsl:when test="$Code = '4.2.'">4.2. Автомобильные дороги</xsl:when>
            <xsl:when test="$Code = '4.3.'">4.3. Объекты топливно-энергетического комплекса</xsl:when>
            <xsl:when test="$Code = '4.4.'">4.4. Объекты информатизации и связи</xsl:when>
            <xsl:when test="$Code = '4.5.'">4.5. Инженерно-технические мероприятия ГО и ЧС</xsl:when>
            <xsl:when test="$Code = '5.1.1.'">5.1.1. Инженерно-геодезические изыскания</xsl:when>
            <xsl:when test="$Code = '5.1.2.'">5.1.2. Инженерно-геологические изыскания</xsl:when>
            <xsl:when test="$Code = '5.1.3.'">5.1.3. Инженерно-гидрометеорологические изыскания</xsl:when>
            <xsl:when test="$Code = '5.1.4.'">5.1.4. Инженерно-экологические изыскания</xsl:when>
            <xsl:when test="$Code = '5.1.5.'">5.1.5. Инженерно-геотехнические изыскания</xsl:when>
            <xsl:when test="$Code = '5.1.6.'">5.1.6. Обследования состояния грунтов оснований зданий и сооружений</xsl:when>
            <xsl:when test="$Code = '5.1.7.'">5.1.7. Обследование состояния строительных конструкций зданий и сооружений</xsl:when>
            <xsl:when test="$Code = '5.2.1.'">5.2.1. Схемы планировочной организации земельных участков</xsl:when>
            <xsl:when test="$Code = '5.2.2.'">5.2.2. Объемно-планировочные решения</xsl:when>
            <xsl:when test="$Code = '5.2.3.'">5.2.3. Конструктивные решения</xsl:when>
            <xsl:when test="$Code = '5.2.4.'">5.2.4. Сети инженерно-технического обеспечения</xsl:when>
            <xsl:when test="$Code = '5.2.4.1.'">5.2.4.1. Электроснабжение</xsl:when>
            <xsl:when test="$Code = '5.2.4.2.'">5.2.4.2. Водоснабжение и водоотведение</xsl:when>
            <xsl:when test="$Code = '5.2.4.3.'">5.2.4.3. Отопление, вентиляция и кондиционирование воздуха, тепловые сети</xsl:when>
            <xsl:when test="$Code = '5.2.4.4.'">5.2.4.4. Системы связи и сигнализации</xsl:when>
            <xsl:when test="$Code = '5.2.4.5.'">5.2.4.5. Системы газоснабжения</xsl:when>
            <xsl:when test="$Code = '5.2.4.6.'">5.2.4.6. Системы автоматизации</xsl:when>
            <xsl:when test="$Code = '5.2.4.7.'">5.2.4.7. Тепловые сети</xsl:when>
            <xsl:when test="$Code = '5.2.5.'">5.2.5. Охрана окружающей среды</xsl:when>
            <xsl:when test="$Code = '5.2.6.'">5.2.6. Санитарно-эпидемиологическая безопасность</xsl:when>
            <xsl:when test="$Code = '5.2.7.'">5.2.7. Пожарная безопасность</xsl:when>
            <xsl:when test="$Code = '5.2.8.'">5.2.8. Инженерно-технические мероприятия ГО и ЧС</xsl:when>
            <xsl:when test="$Code = '5.2.9.'">5.2.9. Промышленная безопасность опасных производственных объектов</xsl:when>
            <xsl:when test="$Code = '5.2.10.'">5.2.10. Ядерная и радиационная безопасность</xsl:when>
            <xsl:when test="$Code = '5.2.11.'">5.2.11. Организация строительства</xsl:when>
            <xsl:when test="$Code = '5.2.12.'">5.2.12. Объекты транспортного комплекса</xsl:when>
            <xsl:when test="$Code = '5.2.12.1.'">5.2.12.1. Воздушный транспорт</xsl:when>
            <xsl:when test="$Code = '5.2.12.2.'">5.2.12.2. Железнодорожный транспорт</xsl:when>
            <xsl:when test="$Code = '5.2.12.3.'">5.2.12.3. Мосты и трубы</xsl:when>
            <xsl:when test="$Code = '5.2.12.4.'">5.2.12.4. Тоннели и метрополитены</xsl:when>
            <xsl:when test="$Code = '5.2.12.5.'">5.2.12.5. Автомобильные дороги</xsl:when>
            <xsl:when test="$Code = '5.2.12.6.'">5.2.12.6. Морской транспорт</xsl:when>
            <xsl:when test="$Code = '5.2.13.'">5.2.13. Объекты топливно-энергетического комплекса</xsl:when>
            <xsl:when test="$Code = '5.2.13.1.'">5.2.13.1. Объекты химических, нефтехимических и нефтегазоперерабатывающих, взрыво- и пожароопасных производств</xsl:when>
            <xsl:when test="$Code = '5.2.13.2.'">5.2.13.2. Линии электропередачи и иные объекты электросетевого хозяйства</xsl:when>
            <xsl:when test="$Code = '5.2.13.3.'">5.2.13.3. Объекты обустройства нефтяных и газовых месторождений</xsl:when>
            <xsl:when test="$Code = '5.2.13.4.'">5.2.13.4. Строительство скважин</xsl:when>
            <xsl:when test="$Code = '5.2.13.5.'">5.2.13.5. Строительство магистральных и промысловых трубопроводов</xsl:when>
            <xsl:when test="$Code = '5.2.13.6.'">5.2.13.6. Объекты использования атомной энергии</xsl:when>
            <xsl:when test="$Code = '5.2.13.7.'">5.2.13.7. Тепловые электростанции</xsl:when>
            <xsl:when test="$Code = '5.2.14.'">5.2.14. Объекты производственного назначения</xsl:when>
            <xsl:when test="$Code = '5.2.14.1.'">5.2.14.1. Объекты космической инфраструктуры</xsl:when>
            <xsl:when test="$Code = '5.2.14.2.'">5.2.14.2. Объекты оборонной промышленности</xsl:when>
            <xsl:when test="$Code = '5.2.14.3.'">5.2.14.3. Объекты металлургической промышленности</xsl:when>
            <xsl:when test="$Code = '5.2.14.4.'">5.2.14.4. Объекты горнодобывающей и горно-перерабатывающей промышленности</xsl:when>
            <xsl:when test="$Code = '5.2.15.'">5.2.15. Объекты информатизации и связи</xsl:when>
            <xsl:when test="$Code = '5.2.16.'">5.2.16. Гидротехнические сооружения</xsl:when>
            <xsl:when test="$Code = '5.3.1.'">5.3.1. Организация государственной экспертизы проектной документации и (или) результатов инженерных изысканий</xsl:when>
            <xsl:when test="$Code = '1.' or $Code = '955.1.'">1. Инженерно-геодезические изыскания</xsl:when>
            <xsl:when test="$Code = '2.' or $Code = '955.2.'">2. Инженерно-геологические изыскания и инженерно-геотехнические изыскания</xsl:when>
            <xsl:when test="$Code = '3.' or $Code = '955.3.'">3. Инженерно-гидрометеорологические изыскания</xsl:when>
            <xsl:when test="$Code = '4.' or $Code = '955.4.'">4. Инженерно-экологические изыскания</xsl:when>
            <xsl:when test="$Code = '5.' or $Code = '955.5.'">5. Схемы планировочной организации земельных участков</xsl:when>
            <xsl:when test="$Code = '6.' or $Code = '955.6.'">6. Объемно-планировочные и архитектурные решения</xsl:when>
            <xsl:when test="$Code = '7.' or $Code = '955.7.'">7. Конструктивные решения</xsl:when>
            <xsl:when test="$Code = '8.' or $Code = '955.8.'">8. Охрана окружающей среды</xsl:when>
            <xsl:when test="$Code = '9.' or $Code = '955.9.'">9. Санитарно-эпидемиологическая безопасность</xsl:when>
            <xsl:when test="$Code = '10.' or $Code = '955.10.'">10. Пожарная безопасность</xsl:when>
            <xsl:when test="$Code = '11.' or $Code = '955.11.'">11. Инженерно-технические мероприятия ГО и ЧС</xsl:when>
            <xsl:when test="$Code = '12.'">12. Организация строительства</xsl:when>
            <xsl:when test="$Code = '13.'">13. Системы водоснабжения и водоотведения</xsl:when>
            <xsl:when test="$Code = '14.'">14. Системы отопления, вентиляции, кондиционирования воздуха и холодоснабжения</xsl:when>
            <xsl:when test="$Code = '15.'">15. Системы газоснабжения</xsl:when>
            <xsl:when test="$Code = '16.'">16. Системы электроснабжения</xsl:when>
            <xsl:when test="$Code = '17.'">17. Системы связи и сигнализации</xsl:when>
            <xsl:when test="$Code = '17.1.'">17.1. Ценообразование и сметное нормирование</xsl:when>
            <xsl:when test="$Code = '18.'">18. Мосты и трубы</xsl:when>
            <xsl:when test="$Code = '19.'">19. Автомобильные дороги</xsl:when>
            <xsl:when test="$Code = '20.'">20. Объекты топливно-энергетического комплекса</xsl:when>
            <xsl:when test="$Code = '21.'">21. Объекты информатизации и связи</xsl:when>
            <xsl:when test="$Code = '22.'">22. Инженерно-геодезические изыскания</xsl:when>
            <xsl:when test="$Code = '23.'">23. Инженерно-геологические изыскания и инженерно-геотехнические изыскания</xsl:when>
            <xsl:when test="$Code = '24.'">24. Инженерно-гидрометеорологические изыскания</xsl:when>
            <xsl:when test="$Code = '25.'">25. Инженерно-экологические изыскания</xsl:when>
            <xsl:when test="$Code = '26.'">26. Схемы планировочной организации земельных участков</xsl:when>
            <xsl:when test="$Code = '27.'">27. Объемно-планировочные решения</xsl:when>
            <xsl:when test="$Code = '28.'">28. Конструктивные решения</xsl:when>
            <xsl:when test="$Code = '29.'">29. Охрана окружающей среды</xsl:when>
            <xsl:when test="$Code = '30.'">30. Санитарно-эпидемиологическая безопасность</xsl:when>
            <xsl:when test="$Code = '31.'">31. Пожарная безопасность</xsl:when>
            <xsl:when test="$Code = '32.'">32. Инженерно-технические мероприятия ГО и ЧС</xsl:when>
            <xsl:when test="$Code = '33.'">33. Промышленная безопасность опасных производственных объектов</xsl:when>
            <xsl:when test="$Code = '34.'">34. Ядерная и радиационная безопасность</xsl:when>
            <xsl:when test="$Code = '35.'">35. Организация строительства</xsl:when>
            <xsl:when test="$Code = '35.1.'">35.1. Ценообразование и сметное нормирование</xsl:when>
            <xsl:when test="$Code = '36.'">36. Системы электроснабжения</xsl:when>
            <xsl:when test="$Code = '37.'">37. Системы водоснабжения и водоотведения</xsl:when>
            <xsl:when test="$Code = '38.'">38. Системы отопления, вентиляции, кондиционирования воздуха и холодоснабжения</xsl:when>
            <xsl:when test="$Code = '39.'">39. Системы связи и сигнализации</xsl:when>
            <xsl:when test="$Code = '40.'">40. Системы газоснабжения</xsl:when>
            <xsl:when test="$Code = '41.'">41. Системы автоматизации</xsl:when>
            <xsl:when test="$Code = '42.'">42. Системы теплоснабжения</xsl:when>
            <xsl:when test="$Code = '43.'">43. Объекты авиационной инфраструктуры</xsl:when>
            <xsl:when test="$Code = '44.'">44. Объекты инфраструктуры железнодорожного транспорта</xsl:when>
            <xsl:when test="$Code = '45.'">45. Мосты и трубы</xsl:when>
            <xsl:when test="$Code = '46.'">46. Тоннели и метрополитены</xsl:when>
            <xsl:when test="$Code = '47.'">47. Автомобильные дороги</xsl:when>
            <xsl:when test="$Code = '48.'">48. Объекты морского и речного транспорта</xsl:when>
            <xsl:when test="$Code = '49.'">49. Объекты химических, нефтехимических и нефтегазоперерабатывающих, взрыво- и пожароопасных производств</xsl:when>
            <xsl:when test="$Code = '50.'">50. Линии электропередачи и иные объекты электросетевого хозяйства</xsl:when>
            <xsl:when test="$Code = '51.'">51. Объекты обустройства нефтяных и газовых месторождений</xsl:when>
            <xsl:when test="$Code = '52.'">52. Скважины</xsl:when>
            <xsl:when test="$Code = '53.'">53. Магистральные и промысловые трубопроводы</xsl:when>
            <xsl:when test="$Code = '54.'">54. Объекты использования атомной энергии</xsl:when>
            <xsl:when test="$Code = '55.'">55. Тепловые электростанции</xsl:when>
            <xsl:when test="$Code = '56.'">56. Объекты оборонной промышленности и иные объекты производственного назначения</xsl:when>
            <xsl:when test="$Code = '57.'">57. Объекты металлургической промышленности</xsl:when>
            <xsl:when test="$Code = '58.'">58. Объекты горнодобывающей и горноперерабатывающей промышленности</xsl:when>
            <xsl:when test="$Code = '59.'">59. Объекты информатизации и связи</xsl:when>
            <xsl:when test="$Code = '60.'">60. Гидротехнические сооружения</xsl:when>
            <xsl:when test="$Code = '61.'">61. Объекты обезвреживания и захоронения отходов I-V классов опасности</xsl:when>
            <xsl:when test="$Code = '62.'">62. Охрана объектов культурного наследия</xsl:when>
            <xsl:when test="$Code = '63.'">63. Объекты социально-культурного назначения</xsl:when>
            <xsl:when test="$Code = '955.12.'">12. Промышленная безопасность опасных производственных объектов</xsl:when>
            <xsl:when test="$Code = '955.13.'">13. Ядерная и радиационная безопасность</xsl:when>
            <xsl:when test="$Code = '955.14.'">14. Организация строительства</xsl:when>
            <xsl:when test="$Code = '955.15.'">15. Ценообразование и сметное нормирование</xsl:when>
            <xsl:when test="$Code = '955.16.'">16. Системы электроснабжения</xsl:when>
            <xsl:when test="$Code = '955.17.'">17. Системы водоснабжения и водоотведения</xsl:when>
            <xsl:when test="$Code = '955.18.'">18. Системы отопления, вентиляции, кондиционирования воздуха и холодоснабжения</xsl:when>
            <xsl:when test="$Code = '955.19.'">19. Системы связи и сигнализации</xsl:when>
            <xsl:when test="$Code = '955.20.'">20. Системы газоснабжения</xsl:when>
            <xsl:when test="$Code = '955.21.'">21. Системы автоматизации</xsl:when>
            <xsl:when test="$Code = '955.22.'">22. Системы теплоснабжения</xsl:when>
            <xsl:when test="$Code = '955.23.'">23. Объекты авиационной инфраструктуры</xsl:when>
            <xsl:when test="$Code = '955.24.'">24. Объекты инфраструктуры железнодорожного транспорта</xsl:when>
            <xsl:when test="$Code = '955.25.'">25. Мосты и трубы</xsl:when>
            <xsl:when test="$Code = '955.26.'">26. Тоннели и метрополитены</xsl:when>
            <xsl:when test="$Code = '955.27.'">27. Автомобильные дороги</xsl:when>
            <xsl:when test="$Code = '955.28.'">28. Объекты морского и речного транспорта</xsl:when>
            <xsl:when test="$Code = '955.29.'">29. Объекты химических, нефтехимических и нефтегазоперерабатывающих, взрыво- и пожароопасных производств</xsl:when>
            <xsl:when test="$Code = '955.30.'">30. Линии электропередачи и иные объекты электросетевого хозяйства</xsl:when>
            <xsl:when test="$Code = '955.31.'">31. Объекты обустройства нефтяных и газовых месторождений</xsl:when>
            <xsl:when test="$Code = '955.32.'">32. Скважины</xsl:when>
            <xsl:when test="$Code = '955.33.'">33. Магистральные и промысловые трубопроводы</xsl:when>
            <xsl:when test="$Code = '955.34.'">34. Объекты использования атомной энергии</xsl:when>
            <xsl:when test="$Code = '955.35.'">35. Тепловые электростанции</xsl:when>
            <xsl:when test="$Code = '955.36.'">36. Объекты оборонной промышленности и иные объекты производственного назначения</xsl:when>
            <xsl:when test="$Code = '955.37.'">37. Объекты металлургической промышленности</xsl:when>
            <xsl:when test="$Code = '955.38.'">38. Объекты горнодобывающей и горноперерабатывающей промышленности</xsl:when>
            <xsl:when test="$Code = '955.39.'">39. Объекты информатизации и связи</xsl:when>
            <xsl:when test="$Code = '955.40.'">40. Гидротехнические сооружения</xsl:when>
            <xsl:when test="$Code = '955.41.'">41. Объекты обезвреживания и захоронения отходов I-V классов опасности</xsl:when>
            <xsl:when test="$Code = '955.42.'">42. Охрана объектов культурного наследия</xsl:when>
            <xsl:when test="$Code = '955.43.'">43. Объекты социально-культурного назначения</xsl:when>
        </xsl:choose>

    </xsl:template>

    <!-- Вывод направления деятельности эксперта в заголовках -->
    <xsl:template name="MakeExpertTypeTitle">
        <xsl:param name="ExpertType"/>

        <xsl:choose>
            <xsl:when test="$ExpertType = '1.1.'">инженерно-геодезических изысканий</xsl:when>
            <xsl:when test="$ExpertType = '1.2.'">инженерно-геологических изысканий</xsl:when>
            <xsl:when test="$ExpertType = '1.3.'">инженерно-гидрометеорологических изысканий</xsl:when>
            <xsl:when test="$ExpertType = '1.4.'">инженерно-экологических изысканий</xsl:when>
            <xsl:when test="$ExpertType = '1.5.'">инженерно-геотехнических изысканий</xsl:when>
            <xsl:when test="$ExpertType = '2.1.'">объемно-планировочных, архитектурных и конструктивных решений, планировочной организации земельного участка, организации строительства</xsl:when>
            <xsl:when test="$ExpertType = '2.1.1.'">планировочной организации земельных участков</xsl:when>
            <xsl:when test="$ExpertType = '2.1.2.'">объемно-планировочных и архитектурных решений</xsl:when>
            <xsl:when test="$ExpertType = '2.1.3.'">конструктивных решений</xsl:when>
            <xsl:when test="$ExpertType = '2.1.4.'">организации строительства</xsl:when>
            <xsl:when test="$ExpertType = '2.2.'">теплогазоснабжения, водоснабжения, водоотведения, канализации, вентиляции и кондиционирования</xsl:when>
            <xsl:when test="$ExpertType = '2.2.1.'">водоснабжения, водоотведения и канализации</xsl:when>
            <xsl:when test="$ExpertType = '2.2.2.'">теплоснабжения, вентиляции и кондиционирования</xsl:when>
            <xsl:when test="$ExpertType = '2.2.3.'">систем газоснабжения</xsl:when>
            <xsl:when test="$ExpertType = '2.3.'">электроснабжения, связи, сигнализации, систем автоматизации</xsl:when>
            <xsl:when test="$ExpertType = '2.3.1.'">электроснабжения и электропотребления</xsl:when>
            <xsl:when test="$ExpertType = '2.3.2.'">систем автоматизации, связи и сигнализации</xsl:when>
            <xsl:when test="$ExpertType = '2.4.'">охрана окружающей среды, санитарно-эпидемиологической безопасности</xsl:when>
            <xsl:when test="$ExpertType = '2.4.1.'">мероприятий по охране окружающей среды</xsl:when>
            <xsl:when test="$ExpertType = '2.4.2.'">санитарно-эпидемиологической безопасности</xsl:when>
            <xsl:when test="$ExpertType = '2.5.'">пожарной безопасности</xsl:when>
            <xsl:when test="$ExpertType = '3.1.'">организации экспертизы проектной документации и (или) результатов инженерных изысканий </xsl:when>
            <xsl:when test="$ExpertType = '4.1.'">мостов и труб</xsl:when>
            <xsl:when test="$ExpertType = '4.2.'">автомобильных дорог</xsl:when>
            <xsl:when test="$ExpertType = '4.3.'">объектов топливно-энергетического комплекса</xsl:when>
            <xsl:when test="$ExpertType = '4.4.'">объектов информатизации и связи</xsl:when>
            <xsl:when test="$ExpertType = '4.5.'">инженерно-технических мероприятия ГО и ЧС</xsl:when>
            <xsl:when test="$ExpertType = '5.1.1.'">инженерно-геодезических изысканий</xsl:when>
            <xsl:when test="$ExpertType = '5.1.2.'">инженерно-геологических изысканий</xsl:when>
            <xsl:when test="$ExpertType = '5.1.3.'">инженерно-гидрометеорологических изысканий</xsl:when>
            <xsl:when test="$ExpertType = '5.1.4.'">инженерно-экологических изысканий</xsl:when>
            <xsl:when test="$ExpertType = '5.1.5.'">инженерно-геотехнических изысканий</xsl:when>
            <xsl:when test="$ExpertType = '5.1.6.'">обследования состояния грунтов оснований зданий и сооружений</xsl:when>
            <xsl:when test="$ExpertType = '5.1.7.'">обследования состояния строительных конструкций зданий и сооружений</xsl:when>
            <xsl:when test="$ExpertType = '5.2.1.'">схем планировочной организации земельных участков</xsl:when>
            <xsl:when test="$ExpertType = '5.2.2.'">объемно-планировочных решений</xsl:when>
            <xsl:when test="$ExpertType = '5.2.3.'">конструктивных решений</xsl:when>
            <xsl:when test="$ExpertType = '5.2.4.'">сетей инженерно-технического обеспечения</xsl:when>
            <xsl:when test="$ExpertType = '5.2.4.1.'">электроснабжения</xsl:when>
            <xsl:when test="$ExpertType = '5.2.4.2.'">водоснабжения и водоотведения</xsl:when>
            <xsl:when test="$ExpertType = '5.2.4.3.'">отопления, вентиляции и кондиционирования воздуха, тепловых сетей</xsl:when>
            <xsl:when test="$ExpertType = '5.2.4.4.'">систем связи и сигнализации</xsl:when>
            <xsl:when test="$ExpertType = '5.2.4.5.'">систем газоснабжения</xsl:when>
            <xsl:when test="$ExpertType = '5.2.4.6.'">систем автоматизации</xsl:when>
            <xsl:when test="$ExpertType = '5.2.4.7.'">тепловых сетей</xsl:when>
            <xsl:when test="$ExpertType = '5.2.5.'">мероприятий по охране окружающей среды</xsl:when>
            <xsl:when test="$ExpertType = '5.2.6.'">санитарно-эпидемиологической безопасности</xsl:when>
            <xsl:when test="$ExpertType = '5.2.7.'">пожарной безопасности</xsl:when>
            <xsl:when test="$ExpertType = '5.2.8.'">инженерно-технических мероприятий ГО и ЧС</xsl:when>
            <xsl:when test="$ExpertType = '5.2.9.'">промышленной безопасности опасных производственных объектов</xsl:when>
            <xsl:when test="$ExpertType = '5.2.10.'">ядерной и радиационной безопасности</xsl:when>
            <xsl:when test="$ExpertType = '5.2.11.'">организации строительства</xsl:when>
            <xsl:when test="$ExpertType = '5.2.12.'">объектов транспортного комплекса</xsl:when>
            <xsl:when test="$ExpertType = '5.2.12.1.'">воздушного транспорта</xsl:when>
            <xsl:when test="$ExpertType = '5.2.12.2.'">железнодорожного транспорта</xsl:when>
            <xsl:when test="$ExpertType = '5.2.12.3.'">мостов и труб</xsl:when>
            <xsl:when test="$ExpertType = '5.2.12.4.'">тоннелей и метрополитена</xsl:when>
            <xsl:when test="$ExpertType = '5.2.12.5.'">автомобильных дороги</xsl:when>
            <xsl:when test="$ExpertType = '5.2.12.6.'">морского транспорт</xsl:when>
            <xsl:when test="$ExpertType = '5.2.13.'">объектов топливно-энергетического комплекса</xsl:when>
            <xsl:when test="$ExpertType = '5.2.13.1.'">объектов химических, нефтехимических и нефтегазоперерабатывающих, взрыво- и пожароопасных производств</xsl:when>
            <xsl:when test="$ExpertType = '5.2.13.2.'">линий электропередачи и иные объекты электросетевого хозяйства</xsl:when>
            <xsl:when test="$ExpertType = '5.2.13.3.'">объектов обустройства нефтяных и газовых месторождений</xsl:when>
            <xsl:when test="$ExpertType = '5.2.13.4.'">строительства скважин</xsl:when>
            <xsl:when test="$ExpertType = '5.2.13.5.'">строительства магистральных и промысловых трубопроводов</xsl:when>
            <xsl:when test="$ExpertType = '5.2.13.6.'">объектов использования атомной энергии</xsl:when>
            <xsl:when test="$ExpertType = '5.2.13.7.'">тепловых электростанций</xsl:when>
            <xsl:when test="$ExpertType = '5.2.14.'">объектов производственного назначения</xsl:when>
            <xsl:when test="$ExpertType = '5.2.14.1.'">объектов космической инфраструктуры</xsl:when>
            <xsl:when test="$ExpertType = '5.2.14.2.'">объектов оборонной промышленности</xsl:when>
            <xsl:when test="$ExpertType = '5.2.14.3.'">объектов металлургической промышленности</xsl:when>
            <xsl:when test="$ExpertType = '5.2.14.4.'">объектов горнодобывающей и горно-перерабатывающей промышленности</xsl:when>
            <xsl:when test="$ExpertType = '5.2.15.'">объектов информатизации и связи</xsl:when>
            <xsl:when test="$ExpertType = '5.2.16.'">гидротехнических сооружений</xsl:when>
            <xsl:when test="$ExpertType = '5.3.1.'">организации государственной экспертизы проектной документации и (или) результатов инженерных изысканий</xsl:when>
            <xsl:when test="$ExpertType = '1.'">инженерно-геодезических изысканий</xsl:when>
            <xsl:when test="$ExpertType = '2.'">инженерно-геологических изысканий и инженерно-геотехнических изысканий</xsl:when>
            <xsl:when test="$ExpertType = '3.'">инженерно-гидрометеорологических изысканий</xsl:when>
            <xsl:when test="$ExpertType = '4.'">инженерно-экологических изысканий</xsl:when>
            <xsl:when test="$ExpertType = '5.'">схем планировочной организации земельных участков</xsl:when>
            <xsl:when test="$ExpertType = '6.' or $ExpertType = '955.6'">объемно-планировочных и архитектурных решений</xsl:when>
            <xsl:when test="$ExpertType = '7.'">конструктивных решений</xsl:when>
            <xsl:when test="$ExpertType = '8.'">мероприятий по охране окружающей среды</xsl:when>
            <xsl:when test="$ExpertType = '9.'">санитарно-эпидемиологической безопасности</xsl:when>
            <xsl:when test="$ExpertType = '10.'">пожарной безопасности</xsl:when>
            <xsl:when test="$ExpertType = '11.'">инженерно-технических мероприятий ГО и ЧС</xsl:when>
            <xsl:when test="$ExpertType = '12.'">организации строительства</xsl:when>
            <xsl:when test="$ExpertType = '13.'">систем водоснабжения и водоотведения</xsl:when>
            <xsl:when test="$ExpertType = '14.'">систем отопления, вентиляции, кондиционирования воздуха и холодоснабжения</xsl:when>
            <xsl:when test="$ExpertType = '15.'">систем газоснабжения</xsl:when>
            <xsl:when test="$ExpertType = '16.'">систем электроснабжения</xsl:when>
            <xsl:when test="$ExpertType = '17.'">систем связи и сигнализации</xsl:when>
            <xsl:when test="$ExpertType = '17.1.'">ценообразования и сметного нормирования</xsl:when>
            <xsl:when test="$ExpertType = '18.'">мостов и труб</xsl:when>
            <xsl:when test="$ExpertType = '19.'">автомобильных дорог</xsl:when>
            <xsl:when test="$ExpertType = '20.'">объектов топливно-энергетического комплекса</xsl:when>
            <xsl:when test="$ExpertType = '21.'">объектов информатизации и связи</xsl:when>
            <xsl:when test="$ExpertType = '22.' or $ExpertType = '955.1.'">инженерно-геодезических изысканий</xsl:when>
            <xsl:when test="$ExpertType = '23.' or $ExpertType = '955.2.'">инженерно-геологических изысканий и инженерно-геотехнических изысканий</xsl:when>
            <xsl:when test="$ExpertType = '24.' or $ExpertType = '955.3.'">инженерно-гидрометеорологических изысканий</xsl:when>
            <xsl:when test="$ExpertType = '25.' or $ExpertType = '955.4.'">инженерно-экологических изысканий</xsl:when>
            <xsl:when test="$ExpertType = '26.' or $ExpertType = '955.5.'">планировочной организации земельных участков</xsl:when>
            <xsl:when test="$ExpertType = '27.' or $ExpertType = '955.6.'">объемно-планировочных решений</xsl:when>
            <xsl:when test="$ExpertType = '28.' or $ExpertType = '955.7.'">конструктивных решений</xsl:when>
            <xsl:when test="$ExpertType = '29.' or $ExpertType = '955.8.'">мероприятий по охране окружающей среды</xsl:when>
            <xsl:when test="$ExpertType = '30.' or $ExpertType = '955.9.'">санитарно-эпидемиологической безопасности</xsl:when>
            <xsl:when test="$ExpertType = '31.' or $ExpertType = '955.10.'">пожарной безопасности</xsl:when>
            <xsl:when test="$ExpertType = '32.' or $ExpertType = '955.11.'">инженерно-технических мероприятий ГО и ЧС</xsl:when>
            <xsl:when test="$ExpertType = '33.' or $ExpertType = '955.12.'">промышленной безопасности опасных производственных объектов</xsl:when>
            <xsl:when test="$ExpertType = '34.' or $ExpertType = '955.13.'">ядерной и радиационной безопасности</xsl:when>
            <xsl:when test="$ExpertType = '35.' or $ExpertType = '955.14.'">организации строительства</xsl:when>
            <xsl:when test="$ExpertType = '35.1.' or $ExpertType = '955.15'">ценообразования и сметного нормирования</xsl:when>
            <xsl:when test="$ExpertType = '36.' or $ExpertType = '955.16.'">систем электроснабжения</xsl:when>
            <xsl:when test="$ExpertType = '37.' or $ExpertType = '955.17.'">систем водоснабжения и водоотведения</xsl:when>
            <xsl:when test="$ExpertType = '38.' or $ExpertType = '955.18.'">систем отопления, вентиляции, кондиционирования воздуха и холодоснабжения</xsl:when>
            <xsl:when test="$ExpertType = '39.' or $ExpertType = '955.19.'">систем связи и сигнализации</xsl:when>
            <xsl:when test="$ExpertType = '40.' or $ExpertType = '955.20.'">систем газоснабжения</xsl:when>
            <xsl:when test="$ExpertType = '41.' or $ExpertType = '955.21.'">систем автоматизации</xsl:when>
            <xsl:when test="$ExpertType = '42.' or $ExpertType = '955.22.'">систем теплоснабжения</xsl:when>
            <xsl:when test="$ExpertType = '43.' or $ExpertType = '955.23.'">объектов авиационной инфраструктуры</xsl:when>
            <xsl:when test="$ExpertType = '44.' or $ExpertType = '955.24.'">объектов инфраструктуры железнодорожного транспорта</xsl:when>
            <xsl:when test="$ExpertType = '45.' or $ExpertType = '955.25.'">мостов и труб</xsl:when>
            <xsl:when test="$ExpertType = '46.' or $ExpertType = '955.26.'">тоннелей и метрополитена</xsl:when>
            <xsl:when test="$ExpertType = '47.' or $ExpertType = '955.27.'">автомобильных дорог</xsl:when>
            <xsl:when test="$ExpertType = '48.' or $ExpertType = '955.28.'">объектов морского и речного транспорта</xsl:when>
            <xsl:when test="$ExpertType = '49.' or $ExpertType = '955.29.'">объектов химических, нефтехимических и нефтегазоперерабатывающих, взрыво- и пожароопасных производств</xsl:when>
            <xsl:when test="$ExpertType = '50.' or $ExpertType = '955.30.'">линий электропередач и иных объектов электросетевого хозяйства</xsl:when>
            <xsl:when test="$ExpertType = '51.' or $ExpertType = '955.31.'">объектов обустройства нефтяных и газовых месторождений</xsl:when>
            <xsl:when test="$ExpertType = '52.' or $ExpertType = '955.32.'">скважин</xsl:when>
            <xsl:when test="$ExpertType = '53.' or $ExpertType = '955.33.'">магистральных и промысловых трубопроводов</xsl:when>
            <xsl:when test="$ExpertType = '54.' or $ExpertType = '955.34.'">объектов использования атомной энергии</xsl:when>
            <xsl:when test="$ExpertType = '55.' or $ExpertType = '955.35.'">тепловых электростанций</xsl:when>
            <xsl:when test="$ExpertType = '56.' or $ExpertType = '955.36.'">объектов оборонной промышленности и иные объекты производственного назначения</xsl:when>
            <xsl:when test="$ExpertType = '57.' or $ExpertType = '955.37.'">объектов металлургической промышленности</xsl:when>
            <xsl:when test="$ExpertType = '58.' or $ExpertType = '955.38.'">объектов горнодобывающей и горноперерабатывающей промышленности</xsl:when>
            <xsl:when test="$ExpertType = '59.' or $ExpertType = '955.39.'">объектов информатизации и связи</xsl:when>
            <xsl:when test="$ExpertType = '60.' or $ExpertType = '955.40.'">гидротехнических сооружений</xsl:when>
            <xsl:when test="$ExpertType = '61.' or $ExpertType = '955.41.'">объектов обезвреживания и захоронения отходов I-V классов опасности</xsl:when>
            <xsl:when test="$ExpertType = '62.' or $ExpertType = '955.42.'">охраны объектов культурного наследия</xsl:when>
            <xsl:when test="$ExpertType = '63.' or $ExpertType = '955.43.'">объектов социально-культурного назначения</xsl:when>
        </xsl:choose>

    </xsl:template>

    <!-- Вывод вида работ -->
    <xsl:template name="MakeWorkType">
        <xsl:param name="Code"/>
        <xsl:choose>
            <xsl:when test="$Code = 1">Строительство</xsl:when>
            <xsl:when test="$Code = 2">Реконструкция</xsl:when>
            <xsl:when test="$Code = 3">Капитальный ремонт</xsl:when>
            <xsl:when test="$Code = 4">Снос объекта капитального строительства</xsl:when>
            <xsl:when test="$Code = 5">Сохранение объекта культурного наследия</xsl:when>
        </xsl:choose>
    </xsl:template>

    <!-- Вывод предмета экспертизы -->
    <xsl:template name="MakeExaminationType">
        <xsl:param name="Code"/>
        <xsl:choose>
            <xsl:when test="$Code = 1">оценка соответствия результатов инженерных изысканий требованиям технических регламентов</xsl:when>
            <xsl:when test="$Code = 2">оценка соответствия проектной документации установленным требованиям</xsl:when>
            <xsl:when test="$Code = 3">проверка достоверности определения сметной стоимости</xsl:when>
        </xsl:choose>
    </xsl:template>

    <!-- Вывод объекта экспертизы -->
    <xsl:template name="MakeObjectType">
        <xsl:param name="Code"/>
        <xsl:choose>
            <xsl:when test="$Code = 1">результаты инженерных изысканий</xsl:when>
            <xsl:when test="$Code = 2">проектная документация</xsl:when>
            <xsl:when test="$Code = 3">проектная документация и результаты инженерных изысканий</xsl:when>
        </xsl:choose>
    </xsl:template>

    <!-- Вывод текстов по абзацам -->
    <xsl:template name="StringReplace">
        <xsl:param name="input"/>
        <xsl:choose>
            <xsl:when test="contains($input, '&#xA;')">
                <p>
                    <xsl:value-of select="substring-before($input, '&#xA;')"/>
                </p>
                <xsl:call-template name="StringReplace">
                    <xsl:with-param name="input" select="substring-after($input, '&#xA;')"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:otherwise>
                <p>
                    <xsl:value-of select="$input"/>
                </p>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <!-- Вывод коментария по абзацам со звездачками-->
    <xsl:template name="StringReplaceComment">
        <xsl:param name="input"/>
        <xsl:param name="count"/>
        <xsl:param name="first"/>

        <xsl:choose>
            <xsl:when test="contains($input, '&#xA;')">
                <p>
                    <xsl:if test="$first = 1">
                        <sup>
                            <xsl:call-template name="MakeFootNoteSymbols">
                                <xsl:with-param name="Count" select="$count"/>
                            </xsl:call-template>
                        </sup>
                        <xsl:text> </xsl:text>
                    </xsl:if>
                    <xsl:value-of select="substring-before($input, '&#xA;')"/>
                </p>
                <xsl:call-template name="StringReplaceComment">
                    <xsl:with-param name="input" select="substring-after($input, '&#xA;')"/>
                    <xsl:with-param name="count" select="0"/>
                    <xsl:with-param name="first" select="number($first) + 1"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:otherwise>
                <p>
                    <xsl:if test="$first = 1">
                        <sup>
                            <xsl:call-template name="MakeFootNoteSymbols">
                                <xsl:with-param name="Count" select="$count"/>
                            </xsl:call-template>
                        </sup>
                        <xsl:text> </xsl:text>
                    </xsl:if>
                    <xsl:value-of select="$input"/>
                </p>
                <br/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template match="EstimatedCost">

        <xsl:variable name="Currency_name">
            <xsl:if test="not(Currency)">тыс. рублей</xsl:if>
            <xsl:if test="Currency">
                <xsl:value-of select="Currency"/>
            </xsl:if>
        </xsl:variable>

        <!-- Вывод сведений о сметной стоимости (без детализации) -->
        <xsl:if test="EstimatedCompleteCostBefore">
            <table>
                <tr>
                    <td class="title" rowspan="2" width="40%">Структура затрат</td>
                    <td class="title" colspan="3" width="60%">Сметная стоимость, <xsl:value-of select="$Currency_name"/></td>
                </tr>
                <tr>
                    <td class="title">на дату представления сметной документации</td>
                    <td class="title">на дату утверждения заключения экспертизы</td>
                    <td class="title">изменение(+/-)</td>
                </tr>
                <tr>
                    <td class="left">Всего</td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedCompleteCostBefore"/>
                        </xsl:call-template>
                    </td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedCompleteCostPost"/>
                        </xsl:call-template>
                    </td>
                    <td class="center">
                        <xsl:call-template name="CountDifference">
                            <xsl:with-param name="Before" select="EstimatedCompleteCostBefore"/>
                            <xsl:with-param name="Post" select="EstimatedCompleteCostPost"/>
                        </xsl:call-template>
                        <!--<xsl:value-of
                            select="(round(number(EstimatedCompleteCostBefore)*100000) - round(number(EstimatedCompleteCostPost)*100000)) div 100000"
                        />-->
                    </td>
                </tr>
            </table>
        </xsl:if>

        <!-- Вывод сведений о сметной стоимости (с детализации при проведении ПДОСС) -->
        <xsl:if test="EstimatedComplexCostBefore">
            <xsl:variable name="CountBefore1">
                <xsl:if test="EstimatedComplexCostBefore/CostBasicComment">1</xsl:if>
                <xsl:if test="not(EstimatedComplexCostBefore/CostBasicComment)">0</xsl:if>
            </xsl:variable>

            <xsl:variable name="CountBefore2">
                <xsl:if test="EstimatedComplexCostBefore/CostComment">
                    <xsl:value-of select="count(EstimatedComplexCostBefore/CostBasicComment) + 1"/>
                </xsl:if>
                <xsl:if test="not(EstimatedComplexCostBefore/CostComment)">0</xsl:if>
            </xsl:variable>


            <xsl:variable name="CountPost1">
                <xsl:if test="EstimatedComplexCostPost/CostBasicComment">
                    <xsl:value-of select="count(EstimatedComplexCostBefore/CostBasicComment | EstimatedComplexCostBefore/CostComment) + 1"/>
                </xsl:if>
                <xsl:if test="not(EstimatedComplexCostPost/CostBasicComment)">0</xsl:if>
            </xsl:variable>

            <xsl:variable name="CountPost2">
                <xsl:if test="EstimatedComplexCostPost/CostComment">
                    <xsl:value-of select="count(EstimatedComplexCostBefore/CostBasicComment | EstimatedComplexCostBefore/CostComment | EstimatedComplexCostPost/CostBasicComment) + 1"/>
                </xsl:if>
                <xsl:if test="not(EstimatedComplexCostPost/CostComment)">0</xsl:if>
            </xsl:variable>

            <table>
                <tr>
                    <td class="title" rowspan="2" width="40%">Структура затрат</td>
                    <td class="title" colspan="3" width="60%">Сметная стоимость, <xsl:value-of select="$Currency_name"/></td>
                </tr>
                <tr>
                    <td class="title">на дату представления сметной документации</td>
                    <td class="title">на дату утверждения заключения экспертизы</td>
                    <td class="title">изменение(+/-)</td>
                </tr>
                <tr>
                    <td class="title" colspan="4">В базисном уровне цен, <xsl:value-of select="$Currency_name"/></td>
                </tr>
                <tr>
                    <td class="left">Всего</td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostBefore/CostBasic"/>
                        </xsl:call-template>
                        <xsl:if test="EstimatedComplexCostBefore/CostBasicComment">
                            <xsl:text> </xsl:text>
                            <sup>
                                <xsl:call-template name="MakeFootNoteSymbols">
                                    <xsl:with-param name="Count" select="$CountBefore1"/>
                                </xsl:call-template>
                            </sup>
                        </xsl:if>
                    </td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostPost/CostBasic"/>
                        </xsl:call-template>
                        <xsl:if test="EstimatedComplexCostPost/CostBasicComment">
                            <xsl:text> </xsl:text>
                            <sup>
                                <xsl:call-template name="MakeFootNoteSymbols">
                                    <xsl:with-param name="Count" select="$CountPost1"/>
                                </xsl:call-template>
                            </sup>
                        </xsl:if>
                    </td>
                    <td class="center">
                        <xsl:call-template name="CountDifference">
                            <xsl:with-param name="Before" select="EstimatedComplexCostBefore/CostBasic"/>
                            <xsl:with-param name="Post" select="EstimatedComplexCostPost/CostBasic"/>
                        </xsl:call-template>
                    </td>
                </tr>
                <tr>
                    <td class="left">в том числе:</td>
                    <td class="center"/>
                    <td class="center"/>
                    <td class="center"/>
                </tr>
                <tr>
                    <td class="left">- строительно-монтажные работы</td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostBefore/WorksCostBasic"/>
                        </xsl:call-template>
                    </td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostPost/WorksCostBasic"/>
                        </xsl:call-template>
                    </td>
                    <td class="center">
                        <xsl:call-template name="CountDifference">
                            <xsl:with-param name="Before" select="EstimatedComplexCostBefore/WorksCostBasic"/>
                            <xsl:with-param name="Post" select="EstimatedComplexCostPost/WorksCostBasic"/>
                        </xsl:call-template>
                    </td>
                </tr>
                <tr>
                    <td class="left">- оборудование</td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostBefore/HardwareCostBasic"/>
                        </xsl:call-template>
                    </td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostPost/HardwareCostBasic"/>
                        </xsl:call-template>
                    </td>
                    <td class="center">
                        <xsl:call-template name="CountDifference">
                            <xsl:with-param name="Before" select="EstimatedComplexCostBefore/HardwareCostBasic"/>
                            <xsl:with-param name="Post" select="EstimatedComplexCostPost/HardwareCostBasic"/>
                        </xsl:call-template>
                    </td>
                </tr>
                <tr>
                    <td class="left">- прочие затраты,</td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostBefore/OtherCostBasic"/>
                        </xsl:call-template>
                    </td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostPost/OtherCostBasic"/>
                        </xsl:call-template>
                    </td>
                    <td class="center">
                        <xsl:call-template name="CountDifference">
                            <xsl:with-param name="Before" select="EstimatedComplexCostBefore/OtherCostBasic"/>
                            <xsl:with-param name="Post" select="EstimatedComplexCostPost/OtherCostBasic"/>
                        </xsl:call-template>
                    </td>
                </tr>
                <tr>
                    <td class="left" style="padding-left: 20px;">в том числе проектно-изыскательские работы</td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostBefore/ProjectWorksCostBasic"/>
                        </xsl:call-template>
                    </td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostPost/ProjectWorksCostBasic"/>
                        </xsl:call-template>
                    </td>
                    <td class="center">
                        <xsl:call-template name="CountDifference">
                            <xsl:with-param name="Before" select="EstimatedComplexCostBefore/ProjectWorksCostBasic"/>
                            <xsl:with-param name="Post" select="EstimatedComplexCostPost/ProjectWorksCostBasic"/>
                        </xsl:call-template>
                    </td>
                </tr>
                <tr>
                    <td class="left">Возвратные суммы</td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostBefore/BackSumCostBasic"/>
                        </xsl:call-template>
                    </td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostPost/BackSumCostBasic"/>
                        </xsl:call-template>
                    </td>
                    <td class="center">
                        <xsl:call-template name="CountDifference">
                            <xsl:with-param name="Before" select="EstimatedComplexCostBefore/BackSumCostBasic"/>
                            <xsl:with-param name="Post" select="EstimatedComplexCostPost/BackSumCostBasic"/>
                        </xsl:call-template>
                    </td>
                </tr>
                <tr>
                    <td class="title" colspan="4">В текущем уровне цен, <xsl:value-of select="$Currency_name"/><xsl:if test="not(Currency)"> (с НДС)</xsl:if></td>
                </tr>
                <tr>
                    <td class="left">Всего</td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostBefore/Cost"/>
                        </xsl:call-template>
                        <xsl:if test="EstimatedComplexCostBefore/CostComment">
                            <xsl:text> </xsl:text>
                            <sup>
                                <xsl:call-template name="MakeFootNoteSymbols">
                                    <xsl:with-param name="Count" select="$CountBefore2"/>
                                </xsl:call-template>
                            </sup>
                        </xsl:if>
                    </td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostPost/Cost"/>
                        </xsl:call-template>
                        <xsl:if test="EstimatedComplexCostPost/CostComment">
                            <xsl:text> </xsl:text>
                            <sup>
                                <xsl:call-template name="MakeFootNoteSymbols">
                                    <xsl:with-param name="Count" select="$CountPost2"/>
                                </xsl:call-template>
                            </sup>
                        </xsl:if>
                    </td>
                    <td class="center">
                        <xsl:call-template name="CountDifference">
                            <xsl:with-param name="Before" select="EstimatedComplexCostBefore/Cost"/>
                            <xsl:with-param name="Post" select="EstimatedComplexCostPost/Cost"/>
                        </xsl:call-template>
                    </td>
                </tr>
                <tr>
                    <td class="left">в том числе:</td>
                    <td class="center"/>
                    <td class="center"/>
                    <td class="center"/>
                </tr>
                <tr>
                    <td class="left">- строительно-монтажные работы<xsl:if test="not(Currency)"> (без НДС)</xsl:if></td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostBefore/WorksCost"/>
                        </xsl:call-template>
                    </td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostPost/WorksCost"/>
                        </xsl:call-template>
                    </td>
                    <td class="center">
                        <xsl:call-template name="CountDifference">
                            <xsl:with-param name="Before" select="EstimatedComplexCostBefore/WorksCost"/>
                            <xsl:with-param name="Post" select="EstimatedComplexCostPost/WorksCost"/>
                        </xsl:call-template>
                    </td>
                </tr>
                <tr>
                    <td class="left">- оборудование<xsl:if test="not(Currency)"> (без НДС)</xsl:if></td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostBefore/HardwareCost"/>
                        </xsl:call-template>
                    </td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostPost/HardwareCost"/>
                        </xsl:call-template>
                    </td>
                    <td class="center">
                        <xsl:call-template name="CountDifference">
                            <xsl:with-param name="Before" select="EstimatedComplexCostBefore/HardwareCost"/>
                            <xsl:with-param name="Post" select="EstimatedComplexCostPost/HardwareCost"/>
                        </xsl:call-template>
                    </td>
                </tr>
                <tr>
                    <td class="left">- прочие затраты<xsl:if test="not(Currency)"> (без НДС)</xsl:if>,</td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostBefore/OtherCost"/>
                        </xsl:call-template>
                    </td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostPost/OtherCost"/>
                        </xsl:call-template>
                    </td>
                    <td class="center">
                        <xsl:call-template name="CountDifference">
                            <xsl:with-param name="Before" select="EstimatedComplexCostBefore/OtherCost"/>
                            <xsl:with-param name="Post" select="EstimatedComplexCostPost/OtherCost"/>
                        </xsl:call-template>
                    </td>
                </tr>
                <tr>
                    <td class="left" style="padding-left: 20px;">в том числе проектно-изыскательские работы</td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostBefore/ProjectWorksCost"/>
                        </xsl:call-template>
                    </td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostPost/ProjectWorksCost"/>
                        </xsl:call-template>
                    </td>
                    <td class="center">
                        <xsl:call-template name="CountDifference">
                            <xsl:with-param name="Before" select="EstimatedComplexCostBefore/ProjectWorksCost"/>
                            <xsl:with-param name="Post" select="EstimatedComplexCostPost/ProjectWorksCost"/>
                        </xsl:call-template>
                    </td>
                </tr>
                <tr>
                    <td class="left">- налог на добавленную стоимость</td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostBefore/NDSCost"/>
                        </xsl:call-template>
                    </td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostPost/NDSCost"/>
                        </xsl:call-template>
                    </td>
                    <td class="center">
                        <xsl:call-template name="CountDifference">
                            <xsl:with-param name="Before" select="EstimatedComplexCostBefore/NDSCost"/>
                            <xsl:with-param name="Post" select="EstimatedComplexCostPost/NDSCost"/>
                        </xsl:call-template>
                    </td>
                </tr>
                <tr>
                    <td class="left">Возвратные суммы</td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostBefore/BackSumCost"/>
                        </xsl:call-template>
                    </td>
                    <td class="center">
                        <xsl:call-template name="NumberFormat">
                            <xsl:with-param name="ToFormat" select="EstimatedComplexCostPost/BackSumCost"/>
                        </xsl:call-template>
                    </td>
                    <td class="center">
                        <xsl:call-template name="CountDifference">
                            <xsl:with-param name="Before" select="EstimatedComplexCostBefore/BackSumCost"/>
                            <xsl:with-param name="Post" select="EstimatedComplexCostPost/BackSumCost"/>
                        </xsl:call-template>
                    </td>
                </tr>
            </table>

            <xsl:if test="EstimatedComplexCostBefore/CostBasicComment">
                <xsl:call-template name="StringReplaceComment">
                    <xsl:with-param name="input" select="EstimatedComplexCostBefore/CostBasicComment"/>
                    <xsl:with-param name="count" select="$CountBefore1"/>
                    <xsl:with-param name="first" select="1"/>
                </xsl:call-template>
            </xsl:if>
            <xsl:if test="EstimatedComplexCostBefore/CostComment">
                <xsl:call-template name="StringReplaceComment">
                    <xsl:with-param name="input" select="EstimatedComplexCostBefore/CostComment"/>
                    <xsl:with-param name="count" select="$CountBefore2"/>
                    <xsl:with-param name="first" select="1"/>
                </xsl:call-template>
            </xsl:if>
            <xsl:if test="EstimatedComplexCostPost/CostBasicComment">
                <xsl:call-template name="StringReplaceComment">
                    <xsl:with-param name="input" select="EstimatedComplexCostPost/CostBasicComment"/>
                    <xsl:with-param name="count" select="$CountPost1"/>
                    <xsl:with-param name="first" select="1"/>
                </xsl:call-template>
            </xsl:if>
            <xsl:if test="EstimatedComplexCostPost/CostComment">
                <xsl:call-template name="StringReplaceComment">
                    <xsl:with-param name="input" select="EstimatedComplexCostPost/CostComment"/>
                    <xsl:with-param name="count" select="$CountPost2"/>
                    <xsl:with-param name="first" select="1"/>
                </xsl:call-template>
            </xsl:if>

        </xsl:if>

    </xsl:template>
    
    <xsl:template match="PriceLevelDate">
        <xsl:if test="Month">
        <xsl:choose>
            <xsl:when test="Month=1">января </xsl:when>
            <xsl:when test="Month=2">февраля </xsl:when>
            <xsl:when test="Month=3">марта </xsl:when>
            <xsl:when test="Month=4">апреля </xsl:when>
            <xsl:when test="Month=5">мая </xsl:when>
            <xsl:when test="Month=6">июня </xsl:when>
            <xsl:when test="Month=7">июля </xsl:when>
            <xsl:when test="Month=8">августа </xsl:when>
            <xsl:when test="Month=9">сентября </xsl:when>
            <xsl:when test="Month=10">октября </xsl:when>
            <xsl:when test="Month=11">ноября </xsl:when>
            <xsl:when test="Month=12">декабря </xsl:when>
        </xsl:choose>
        </xsl:if>
        <xsl:if test="Quarter">
            <xsl:choose>
                <xsl:when test="Quarter=1">1 квартала </xsl:when>
                <xsl:when test="Quarter=2">2 квартала </xsl:when>
                <xsl:when test="Quarter=3">3 квартала </xsl:when>
                <xsl:when test="Quarter=4">4 квартала </xsl:when>
            </xsl:choose>
        </xsl:if>
        <xsl:value-of select="Year"/>
        <xsl:if test="position()=last()">, </xsl:if>
    </xsl:template>

    <xsl:template name="CountDifference">
        <xsl:param name="Before"/>
        <xsl:param name="Post"/>

        <xsl:choose>
            <xsl:when test="$Post = 'Не требуется'">Не требуется</xsl:when>
            <xsl:when test="$Post = 'Отсутствует'">Отсутствует</xsl:when>
            <xsl:when test="$Before = 'Не требуется' or $Before = 'Отсутствует'">
                <xsl:call-template name="NumberFormat">
                    <xsl:with-param name="ToFormat" select="number($Post)"/>
                </xsl:call-template>
            </xsl:when>
            <xsl:otherwise>
                <xsl:if test="number($Before) != 0 and number($Post) = 0">
                    <xsl:call-template name="NumberFormat">
                        <xsl:with-param name="ToFormat" select="number(-1 * $Before)"/>
                    </xsl:call-template>
                </xsl:if>
                <xsl:if test="number($Before) = 0 and number($Post) != 0">
                    <xsl:call-template name="NumberFormat">
                        <xsl:with-param name="ToFormat" select="number($Post)"/>
                    </xsl:call-template>
                </xsl:if>
                <xsl:if test="number($Before) = 0 and number($Post) = 0"> 0.00 </xsl:if>
                <xsl:if test="number($Before) != 0 and number($Post) != 0">
                    <xsl:call-template name="NumberFormat">
                        <xsl:with-param name="ToFormat" select="(round(number($Post) * 100000) - round(number($Before) * 100000)) div 100000"/>
                    </xsl:call-template>
                </xsl:if>
            </xsl:otherwise>
        </xsl:choose>

    </xsl:template>

    <xsl:template name="NumberFormat">
        <xsl:param name="ToFormat"/>
        <xsl:choose>
            <xsl:when test="$ToFormat = 'Не требуется' or $ToFormat = 'Отсутствует'">
                <xsl:value-of select="$ToFormat"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:value-of select="format-number($ToFormat, '#0.00')"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>


    <xsl:template name="EngineeringSurveysDocTable">
        <xsl:param name="Code"/>
        <xsl:if test="Documents/Document[DocType = $Code and File]">
            <tr>
                <td colspan="5">
                    <p class="title">
                        <xsl:choose>
                            <xsl:when test="$Code = '06.99'"> Иные отчетные материалы </xsl:when>
                            <xsl:otherwise>
                                <xsl:call-template name="MakeRII">
                                    <xsl:with-param name="TypeCode" select="$Code"/>
                                </xsl:call-template>
                            </xsl:otherwise>
                        </xsl:choose>
                    </p>
                </td>
            </tr>
            <xsl:for-each select="Documents/Document[DocType = $Code and File]">
                <xsl:call-template name="TableDocument"/>
            </xsl:for-each>
        </xsl:if>
    </xsl:template>

    <xsl:template name="ProjectDocumentsDocTable">
        <xsl:param name="Code"/>
        <xsl:if test="Documents/Document[DocType = $Code and File]">
            <tr>
                <td colspan="5">
                    <p class="title">
                        <xsl:call-template name="MakeProjectSection">
                            <xsl:with-param name="Code" select="$Code"/>
                        </xsl:call-template>
                    </p>
                </td>
            </tr>
            <xsl:for-each select="Documents/Document[DocType = $Code and File]">
                <xsl:call-template name="TableDocument"/>
            </xsl:for-each>
        </xsl:if>
    </xsl:template>


    <xsl:template name="EngineeringSurveysReports">
        <xsl:param name="Code"/>
        <xsl:if test="Documents/Document[DocType = $Code and File]">
            <tr>
                <td colspan="3">
                    <p class="title">
                        <xsl:choose>
                            <xsl:when test="$Code = '06.99'"> Иные отчетные материалы </xsl:when>
                            <xsl:otherwise>
                                <xsl:call-template name="MakeRII">
                                    <xsl:with-param name="TypeCode" select="$Code"/>
                                </xsl:call-template>
                            </xsl:otherwise>
                        </xsl:choose>
                    </p>
                </td>
            </tr>
            <xsl:for-each select="Documents/Document[DocType = $Code and File]">
                <xsl:sort select="DocDate"/>
                <tr>
                    <td>
                        <xsl:value-of select="DocName"/>
                    </td>
                    <td class="center">
                        <xsl:call-template name="formatdate">
                            <xsl:with-param name="DateTimeStr" select="DocDate"/>
                        </xsl:call-template>
                    </td>
                    <td>
                        <xsl:for-each select="FullDocIssueAuthor">
                            <xsl:if test="position() != 1">
                                <xsl:text>;</xsl:text>
                                <br/>
                                <br/>
                            </xsl:if>
                            <xsl:apply-templates select="Organization"/>
                            <xsl:apply-templates select="ForeignOrganization"/>
                            <xsl:apply-templates select="IP"/>
                            <xsl:apply-templates select="Person"/>
                        </xsl:for-each>
                    </td>
                </tr>
            </xsl:for-each>
        </xsl:if>
    </xsl:template>

    <xsl:template name="MakeProjectDocumentsMismatch">
        <xsl:param name="ExpertType"/>
        <xsl:for-each select="//Conclusion/ExpertEstimate/Mismatches/ProjectDocumentsMismatch[@ExpertType = $ExpertType]">
            <tr>
                <td>
                    <p class="center">
                        <xsl:number value="position()" format="1. "/>
                    </p>
                </td>
                <td>
                    <p class="left no-first-line">
                        <xsl:value-of select="Summary"/>
                    </p>
                </td>
                <td>
                    <p class="left no-first-line">
                        <xsl:value-of select="Part"/>
                    </p>
                </td>
                <td>
                    <p class="left no-first-line">
                        <xsl:value-of select="Link"/>
                    </p>
                </td>
            </tr>
        </xsl:for-each>
    </xsl:template>

    <xsl:template name="MakeFootNoteSymbols">
        <xsl:param name="Count"/>
        <xsl:if test="$Count != 0">
            <xsl:text>*</xsl:text>
            <xsl:if test="$Count != 1">
                <xsl:call-template name="MakeFootNoteSymbols">
                    <xsl:with-param name="Count" select="number($Count) - 1"/>
                </xsl:call-template>
            </xsl:if>
        </xsl:if>
    </xsl:template>

</xsl:stylesheet>
