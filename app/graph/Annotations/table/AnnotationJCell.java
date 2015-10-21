package graph.Annotations.table;

import com.antigenomics.vdjdb.browsing.CdrMatch;

import java.util.Objects;

/**
 * Created by bvdmitri on 14.10.15.
 */

public class AnnotationJCell {
    public String j;
    public String jdb;
    public Boolean match;

    public AnnotationJCell() {}

    public AnnotationJCell(CdrMatch cdrMatch) {
        this.j = cdrMatch.getQuery().getJ();
        this.jdb = cdrMatch.getSubject().j;
        this.match = cdrMatch.isjMatch();
    }

    public boolean recordEquals(AnnotationJCell jCell) {
        return Objects.equals(j, jCell.j);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AnnotationJCell)) return false;

        AnnotationJCell that = (AnnotationJCell) o;

        return !(jdb != null ? !jdb.equals(that.jdb) : that.jdb != null);

    }

    @Override
    public int hashCode() {
        return jdb != null ? jdb.hashCode() : 0;
    }
}
