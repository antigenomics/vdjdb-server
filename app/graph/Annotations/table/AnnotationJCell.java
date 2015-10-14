package graph.Annotations.table;

import com.antigenomics.vdjdb.browsing.CdrMatch;

/**
 * Created by bvdmitri on 14.10.15.
 */

public class AnnotationJCell {
    public String j;
    public Boolean match;

    public AnnotationJCell(CdrMatch cdrMatch) {
        this.j = cdrMatch.getQuery().getJ();
        this.match = cdrMatch.isjMatch();
    }
}
