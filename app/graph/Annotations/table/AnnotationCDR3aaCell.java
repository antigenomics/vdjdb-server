package graph.Annotations.table;

import com.antigenomics.vdjdb.browsing.CdrMatch;

/**
 * Created by bvdmitri on 14.10.15.
 */
public class AnnotationCDR3aaCell {
    public String cdr3aa;
    public Integer pos;
    public Integer vend;
    public Integer jstart;
    public Integer dstart;
    public Integer dend;

    public AnnotationCDR3aaCell() {}

    public AnnotationCDR3aaCell(CdrMatch cdrMatch) {
        this.cdr3aa = cdrMatch.getQuery().getCdr3aa();
        this.pos = cdrMatch.getAlignment().getAbsoluteMutations().firsMutationPosition();
        this.vend = cdrMatch.getQuery().getVEnd();
        this.jstart = cdrMatch.getQuery().getJStart();
        this.dstart = cdrMatch.getQuery().getDStart();
        this.dend = cdrMatch.getQuery().getDEnd();
    }
}
