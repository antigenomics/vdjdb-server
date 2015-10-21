package graph.CountPiechart;

import graph.Annotations.table.AnnotationRow;

/**
 * Created by bvdmitri on 21.10.15.
 */
public class UniqueRecord {
    public AnnotationRow row;
    public int hits;
    public int count;

    public UniqueRecord(AnnotationRow row, int hits, int count) {
        this.row = row;
        this.hits = hits;
        this.count = count;
    }

    public UniqueRecord() {
    }
}
