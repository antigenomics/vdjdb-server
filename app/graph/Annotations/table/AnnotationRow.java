package graph.Annotations.table;

import com.antigenomics.vdjdb.browsing.CdrMatch;

import java.util.List;

/**
 * Created by bvdmitri on 14.10.15.
 */

public class AnnotationRow {
    enum Columns{
        CHAIN("chain", 0),
        MHC("mhc", 1),
        NATURE("nature", 2),
        DISEASE("disease", 3),
        ORIGIN("origin", 4),
        ANTIGEN_SEQ("antigen_seq", 5),
        ANTIGEN_NAME("antigen_name", 6),
        METHOD("method", 7),
        GENBANK("genbank", 8),
        REFERENCE("reference", 9)
        ;
        private String name;
        private int column;

        Columns(String name, int column) {
            this.name = name;
            this.column = column;
        }

        public String getName() {
            return name;
        }

        public int getColumn() {
            return column;
        }
    }


    private AnnotationCDR3aaCell cdr3aaCell;
    private AnnotationVCell vCell;
    private AnnotationJCell jCell;
    private double freq;
    private String chain;
    private String mhc;
    private String nature;
    private String disease;
    private String origin;
    private String antigenSeq;
    private String antigenName;
    private String method;
    private String genbank;
    private String reference;

    public AnnotationRow(CdrMatch cdrMatch) {
        this.cdr3aaCell = new AnnotationCDR3aaCell(cdrMatch);
        this.vCell = new AnnotationVCell(cdrMatch);
        this.jCell = new AnnotationJCell(cdrMatch);
        this.freq = cdrMatch.getQuery().getFreq();
        List<String> annotation = cdrMatch.getSubject().getAnnotation();
        this.chain = annotation.get(Columns.CHAIN.getColumn());
        this.mhc = annotation.get(Columns.MHC.getColumn());
        this.nature = annotation.get(Columns.NATURE.getColumn());
        this.disease = annotation.get(Columns.DISEASE.getColumn());
        this.origin = annotation.get(Columns.ORIGIN.getColumn());
        this.antigenSeq = annotation.get(Columns.ANTIGEN_SEQ.getColumn());
        this.antigenName = annotation.get(Columns.ANTIGEN_NAME.getColumn());
        this.method = annotation.get(Columns.METHOD.getColumn());
        this.genbank = annotation.get(Columns.GENBANK.getColumn());
        this.reference = annotation.get(Columns.REFERENCE.getColumn());

    }

    public AnnotationCDR3aaCell getCdr3aaCell() {
        return cdr3aaCell;
    }

    public AnnotationVCell getvCell() {
        return vCell;
    }

    public AnnotationJCell getjCell() {
        return jCell;
    }

    public String getChain() {
        return chain;
    }

    public String getMhc() {
        return mhc;
    }

    public String getNature() {
        return nature;
    }

    public String getDisease() {
        return disease;
    }

    public String getOrigin() {
        return origin;
    }

    public String getAntigenSeq() {
        return antigenSeq;
    }

    public String getAntigenName() {
        return antigenName;
    }

    public String getMethod() {
        return method;
    }

    public String getGenbank() {
        return genbank;
    }

    public String getReference() {
        return reference;
    }

    public double getFreq() {
        return freq;
    }
}
