package graph.Annotations.table;

import com.antigenomics.vdjdb.browsing.CdrMatch;

import java.util.Objects;

/**
 * Created by bvdmitri on 14.10.15.
 */
public class AnnotationVCell {
    public String v;
    public String vdb;
    public Boolean match;

    public AnnotationVCell() {}

    public AnnotationVCell(CdrMatch cdrMatch) {
        this.v = cdrMatch.getQuery().getV();
        this.vdb = cdrMatch.getSubject().v;
        this.match = cdrMatch.isvMatch();
    }

    public boolean recordEquals(AnnotationVCell vCell) {
        return Objects.equals(v, vCell.v);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AnnotationVCell)) return false;

        AnnotationVCell that = (AnnotationVCell) o;

        return !(vdb != null ? !vdb.equals(that.vdb) : that.vdb != null);

    }

    @Override
    public int hashCode() {
        return vdb != null ? vdb.hashCode() : 0;
    }
}
