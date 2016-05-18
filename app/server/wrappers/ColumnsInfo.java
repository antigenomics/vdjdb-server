package server.wrappers;

import com.antigenomics.vdjdb.db.Column;
import com.antigenomics.vdjdb.sequence.SequenceColumn;
import com.antigenomics.vdjdb.text.TextColumn;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Created by bvdmitri on 27.04.16.
 */
public class ColumnsInfo {
    public class ColumnInfo {
        public Column column;
        public Boolean autocomplete = false;
        public Set<String> values = null;

        public ColumnInfo(Column column) {
            this.column = column;
            if (column.getMetadata().containsKey("searchable") && column.getMetadata().get("searchable").equals("1")) {
                if (column.getMetadata().containsKey("type") && column.getMetadata().get("type").equals("txt")) {
                    this.autocomplete = true;
                    this.values = ((TextColumn)column).getValues();
                }

            }
        }
    }
    public List<ColumnInfo> columns;

    public ColumnsInfo(List<Column> columns) {
        this.columns = new ArrayList<>();
        for (Column column : columns) {
            this.columns.add(new ColumnInfo(column));
        }
    }
}
