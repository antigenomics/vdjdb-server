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

    public AnnotationHeader(String db_name, String name) {
        this.name = name;
        this.db_name = db_name;
    }

    public AnnotationHeader() {}

    public static List<AnnotationHeader> getHeader() {
        List<AnnotationHeader> fields = new ArrayList<>();
        for (CdrEntrySetDB.Fields setEntryField : CdrEntrySetDB.Fields.values()) {
            if (!setEntryField.getFieldName().contains("id"))
                fields.add(new AnnotationHeader(setEntryField.getFieldName(), setEntryField.getName()));
        }
        for (EntryDB.Fields entryField : EntryDB.Fields.values()) {
            if (!entryField.getFieldName().contains("id"))
                fields.add(new AnnotationHeader(entryField.getFieldName(), entryField.getName()));
        }
        return fields;
    }

    public String getName() {
        return name;
    }

    public String getDb_name() {
        return db_name;
    }
}
