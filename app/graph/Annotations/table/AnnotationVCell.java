package graph.Annotations.table;

import com.antigenomics.vdjdb.browsing.CdrMatch;

/**
 * Created by bvdmitri on 14.10.15.
 */
public class AnnotationVCell {
    public String v;
    public Boolean match;

    public AnnotationVCell(CdrMatch cdrMatch) {
        this.v = cdrMatch.getQuery().getV();
        this.match = cdrMatch.isvMatch();
    }
}
