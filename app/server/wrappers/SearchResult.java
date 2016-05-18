package server.wrappers;

import com.antigenomics.vdjdb.db.Column;
import com.antigenomics.vdjdb.db.DatabaseSearchResult;
import com.antigenomics.vdjdb.sequence.SequenceFilter;
import com.antigenomics.vdjdb.text.TextFilter;
import server.GlobalDatabase;

import java.util.ArrayList;
import java.util.List;

/**
 * Created by bvdmitri on 20.03.16.
 */
public class SearchResult {

    public List<DatabaseSearchResult> results;
    public List<Column> columns;
    public List<String> warnings;


    public SearchResult(ArrayList<TextFilter> textFilters, ArrayList<SequenceFilter> sequenceFilters, ArrayList<String> warnings) {
        this.results = GlobalDatabase.search(textFilters, sequenceFilters);
        this.columns = GlobalDatabase.getColumns();
        this.warnings = warnings;
    }
}
