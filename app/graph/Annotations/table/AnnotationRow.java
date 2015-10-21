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


    private AnnotationCDR3aaCell cdr3;
    private AnnotationVCell v;
    private AnnotationJCell j;
    private double freq;
    private int count;
    private String chain;
    private String mhc;
    private String nature;
    private String disease;
    private String origin;
    private String antigen_seq;
    private String antigen_name;
    private String method;
    private String genbank;
    private String reference;

    public AnnotationRow() {}

    public AnnotationRow(CdrMatch cdrMatch) {
        this.cdr3 = new AnnotationCDR3aaCell(cdrMatch);
        this.v = new AnnotationVCell(cdrMatch);
        this.j = new AnnotationJCell(cdrMatch);
        this.freq = cdrMatch.getQuery().getFreq();
        this.count = cdrMatch.getQuery().getCount();
        List<String> annotation = cdrMatch.getSubject().getAnnotation();
        this.chain = annotation.get(Columns.CHAIN.getColumn());
        this.mhc = annotation.get(Columns.MHC.getColumn());
        this.nature = annotation.get(Columns.NATURE.getColumn());
        this.disease = annotation.get(Columns.DISEASE.getColumn());
        this.origin = annotation.get(Columns.ORIGIN.getColumn());
        this.antigen_seq = annotation.get(Columns.ANTIGEN_SEQ.getColumn());
        this.antigen_name = annotation.get(Columns.ANTIGEN_NAME.getColumn());
        this.method = annotation.get(Columns.METHOD.getColumn());
        this.genbank = annotation.get(Columns.GENBANK.getColumn());
        this.reference = annotation.get(Columns.REFERENCE.getColumn());

    }

    public AnnotationCDR3aaCell getCdr3() {
        return cdr3;
    }

    public AnnotationVCell getV() {
        return v;
    }

    public AnnotationJCell getJ() {
        return j;
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

    public String getAntigen_seq() {
        return antigen_seq;
    }

    public String getAntigen_name() {
        return antigen_name;
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

    public int getCount() {
        return count;
    }

    public boolean recordEquals(AnnotationRow record) {
        return (cdr3.cdr3recordEquals(record.cdr3)) && (v.recordEquals(record.v) && (j.recordEquals(record.j)));
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AnnotationRow)) return false;

        AnnotationRow that = (AnnotationRow) o;

        if (cdr3 != null ? !cdr3.equals(that.cdr3) : that.cdr3 != null) return false;
        if (v != null ? !v.equals(that.v) : that.v != null) return false;
        if (j != null ? !j.equals(that.j) : that.j != null) return false;
        if (chain != null ? !chain.equals(that.chain) : that.chain != null) return false;
        if (mhc != null ? !mhc.equals(that.mhc) : that.mhc != null) return false;
        if (nature != null ? !nature.equals(that.nature) : that.nature != null) return false;
        if (disease != null ? !disease.equals(that.disease) : that.disease != null) return false;
        if (origin != null ? !origin.equals(that.origin) : that.origin != null) return false;
        if (antigen_seq != null ? !antigen_seq.equals(that.antigen_seq) : that.antigen_seq != null) return false;
        if (antigen_name != null ? !antigen_name.equals(that.antigen_name) : that.antigen_name != null) return false;
        if (method != null ? !method.equals(that.method) : that.method != null) return false;
        if (genbank != null ? !genbank.equals(that.genbank) : that.genbank != null) return false;
        return !(reference != null ? !reference.equals(that.reference) : that.reference != null);

    }

    @Override
    public int hashCode() {
        int result;
        result = cdr3 != null ? cdr3.hashCode() : 0;
        result = 31 * result + (v != null ? v.hashCode() : 0);
        result = 31 * result + (j != null ? j.hashCode() : 0);
        result = 31 * result + (chain != null ? chain.hashCode() : 0);
        result = 31 * result + (mhc != null ? mhc.hashCode() : 0);
        result = 31 * result + (nature != null ? nature.hashCode() : 0);
        result = 31 * result + (disease != null ? disease.hashCode() : 0);
        result = 31 * result + (origin != null ? origin.hashCode() : 0);
        result = 31 * result + (antigen_seq != null ? antigen_seq.hashCode() : 0);
        result = 31 * result + (antigen_name != null ? antigen_name.hashCode() : 0);
        result = 31 * result + (method != null ? method.hashCode() : 0);
        result = 31 * result + (genbank != null ? genbank.hashCode() : 0);
        result = 31 * result + (reference != null ? reference.hashCode() : 0);
        return result;
    }
}
