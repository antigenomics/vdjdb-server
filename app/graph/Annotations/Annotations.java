package graph.Annotations;

import com.antigenomics.vdjdb.browsing.BrowserResult;
import com.antigenomics.vdjdb.browsing.CdrMatch;
import graph.Annotations.table.AnnotationHeader;
import graph.Annotations.table.AnnotationRow;

import java.util.ArrayList;
import java.util.List;

/**
 * Created by bvdmitri on 14.10.15.
 */
public class Annotations {
    private final List<AnnotationHeader> header = AnnotationHeader.getHeader();
    private List<AnnotationRow> rows;

    public Annotations(BrowserResult browserResult) {
        this.rows = new ArrayList<>();
        for (CdrMatch cdrMatch : browserResult) {
            rows.add(new AnnotationRow(cdrMatch));
        }
    }

    public List<AnnotationHeader> getHeader() {
        return header;
    }

    public List<AnnotationRow> getRows() {
        return rows;
    }
}
