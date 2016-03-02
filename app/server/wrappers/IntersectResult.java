package server.wrappers;

import com.antigenomics.vdjdb.db.Row;
import com.antigenomics.vdjdb.impl.ClonotypeSearchResult;
import com.antigenomics.vdjtools.sample.Clonotype;
import com.milaboratory.core.alignment.AlignmentHelper;

import java.util.ArrayList;
import java.util.List;

/**
 * Created by bvdmitri on 02.03.16.
 */
public class IntersectResult {

    public class AlignmentHelperResult {
        public AlignmentHelper alignmentHelper;
        public Row row;

        public AlignmentHelperResult(ClonotypeSearchResult clonotypeSearchResult) {
            alignmentHelper = clonotypeSearchResult.getResult().getAlignment().getAlignmentHelper();
            row = clonotypeSearchResult.getRow();
        }
    }

    public String cdr3aa;
    public List<AlignmentHelperResult> alignmentHelperList = new ArrayList<>();

    public IntersectResult(Clonotype clonotype, List<ClonotypeSearchResult> clonotypeSearchResults) {
        cdr3aa = clonotype.getCdr3aa();
        for (ClonotypeSearchResult clonotypeSearchResult : clonotypeSearchResults) {
            alignmentHelperList.add(new AlignmentHelperResult(clonotypeSearchResult));
        }
    }
}

