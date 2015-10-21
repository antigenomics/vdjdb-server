package graph.Annotations.table;

import com.antigenomics.vdjdb.browsing.CdrMatch;

import java.util.Objects;

/**
 * Created by bvdmitri on 14.10.15.
 */
public class AnnotationCDR3aaCell {
    public String cdr3aa;
    public String dbcdr3aa;
    public Integer pos;
    public Integer vend;
    public Integer jstart;
    public Integer dstart;
    public Integer dend;

    public AnnotationCDR3aaCell() {}

    public AnnotationCDR3aaCell(CdrMatch cdrMatch) {
        this.cdr3aa = cdrMatch.getQuery().getCdr3aa();
        this.dbcdr3aa = cdrMatch.getSubject().getCdr3aa();
        this.pos = cdrMatch.getAlignment().getAbsoluteMutations().firsMutationPosition();
        this.vend = cdrMatch.getQuery().getVEnd();
        this.jstart = cdrMatch.getQuery().getJStart();
        this.dstart = cdrMatch.getQuery().getDStart();
        this.dend = cdrMatch.getQuery().getDEnd();
    }

    public boolean cdr3recordEquals(AnnotationCDR3aaCell cdr3aaCell) {
        return (Objects.equals(cdr3aa, cdr3aaCell.cdr3aa)) && (Objects.equals(pos, cdr3aaCell.pos)) && (Objects.equals(vend, cdr3aaCell.vend))
                    && (Objects.equals(jstart, cdr3aaCell.jstart)) && (Objects.equals(dstart, cdr3aaCell.dstart)) && (Objects.equals(dend, cdr3aaCell.dend));
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AnnotationCDR3aaCell)) return false;

        AnnotationCDR3aaCell that = (AnnotationCDR3aaCell) o;

        return !(dbcdr3aa != null ? !dbcdr3aa.equals(that.dbcdr3aa) : that.dbcdr3aa != null);

    }

    @Override
    public int hashCode() {
        return dbcdr3aa != null ? dbcdr3aa.hashCode() : 0;
    }
}
