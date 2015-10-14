package graph.Annotations.table;

import com.antigenomics.vdjdb.models.CdrEntrySetDB;
import com.antigenomics.vdjdb.models.EntryDB;

import java.util.ArrayList;
import java.util.List;

/**
 * Created by bvdmitri on 14.10.15.
 */
public class AnnotationHeader {
    private String name;
    private String db_name;

    public AnnotationHeader(String name, String db_name) {
        this.name = name;
        this.db_name = db_name;
    }

    public static List<AnnotationHeader> getHeader() {
        List<AnnotationHeader> fields = new ArrayList<>();
        for (EntryDB.Fields entryField : EntryDB.Fields.values()) {
            if (!entryField.getFieldName().contains("id"))
                fields.add(new AnnotationHeader(entryField.getFieldName(), entryField.getName()));
        }
        for (CdrEntrySetDB.Fields setEntryField : CdrEntrySetDB.Fields.values()) {
            if (!setEntryField.getFieldName().contains("id"))
                fields.add(new AnnotationHeader(setEntryField.getFieldName(), setEntryField.getName()));
        }
        return fields;
    }
}
