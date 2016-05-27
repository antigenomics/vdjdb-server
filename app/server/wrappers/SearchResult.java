package server.wrappers;

import com.antigenomics.vdjdb.db.Column;
import com.antigenomics.vdjdb.db.DatabaseSearchResult;
import com.antigenomics.vdjdb.db.Entry;
import com.antigenomics.vdjdb.sequence.SequenceFilter;
import com.antigenomics.vdjdb.text.TextFilter;
import server.GlobalDatabase;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Created by bvdmitri on 20.03.16.
 */
public class SearchResult {

    private static final int PAGE_SIZE = 10;

    private int pageSize = PAGE_SIZE;
    public List<DatabaseSearchResult> results;
    public List<Column> columns;
    public List<String> warnings;



    public SearchResult(ArrayList<TextFilter> textFilters, ArrayList<SequenceFilter> sequenceFilters, ArrayList<String> warnings) {
        this.results = GlobalDatabase.search(textFilters, sequenceFilters);
        this.columns = GlobalDatabase.getColumns();
        this.warnings = warnings;
    }

    public List<DatabaseSearchResult> getPage(int page) {
        if (page < 0) page = 0;
        int fromIndex = pageSize * page;
        fromIndex = fromIndex > results.size() ? results.size() : fromIndex;
        int toIndex = pageSize * (page + 1);
        toIndex = toIndex > results.size() ? results.size() : toIndex;
        return results.subList(fromIndex, toIndex);
    }

    public void sort(int index, String type) {
        results.sort(new Comparator<DatabaseSearchResult>() {
            @Override
            public int compare(DatabaseSearchResult o1, DatabaseSearchResult o2) {
                Entry entry1 = o1.getRow().getAt(index);
                Entry entry2 = o2.getRow().getAt(index);
                int comparison = entry1.getValue().compareTo(entry2.getValue());
                switch (type) {
                    case "asc":
                        return comparison;
                    case "desc":
                        return -comparison;
                    default:
                        return 0;
                }
            }
        });
    }

    public Integer getMaxPages() {;
        int maxPages = results.size() / pageSize;
        if (maxPages * pageSize < results.size()) maxPages++;
        return maxPages;
    }

    public Integer getPageSize() {
        return pageSize;
    }

    public Integer getTotalItems() {
        return results.size();
    }
}
