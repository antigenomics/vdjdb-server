package server.wrappers;

import com.antigenomics.vdjdb.db.Row;
import com.antigenomics.vdjdb.impl.ClonotypeSearchResult;
import com.antigenomics.vdjtools.sample.Clonotype;
import com.milaboratory.core.alignment.AlignmentHelper;
import com.milaboratory.core.mutations.Mutation;
import com.milaboratory.core.mutations.Mutations;

import java.util.ArrayList;
import java.util.List;

/**
 * Created by bvdmitri on 02.03.16.
 */
public class IntersectResult {

    public class AlignmentHelperResult {
        public AlignmentHelper alignmentHelper;
        public Row row;
        public Float score;

        public AlignmentHelperResult(ClonotypeSearchResult clonotypeSearchResult) {
            alignmentHelper = clonotypeSearchResult.getResult().getAlignment().getAlignmentHelper();
            score = clonotypeSearchResult.getResult().getAlignment().getScore();
            row = clonotypeSearchResult.getRow();
        }
    }

    public class CDR3Wrapper {
        public String cdr3aa;
        public String cdr3nt;
        public int vend;
        public int jstart;
        public int dstart;
        public int dend;

        public CDR3Wrapper(Clonotype clonotype) {
            cdr3aa = clonotype.getCdr3aa();
            cdr3nt = clonotype.getCdr3nt();
            vend = clonotype.getVEnd();
            jstart = clonotype.getJStart();
            dstart = clonotype.getDStart();
            dend = clonotype.getDEnd();
        }
    }

    public class ClonotypeWrapper {
        public CDR3Wrapper cdr;
        public String v;
        public String j;
        public Long count;
        public Double freq;

        public ClonotypeWrapper(Clonotype clonotype) {
            cdr = new CDR3Wrapper(clonotype);
            v = clonotype.getV();
            j = clonotype.getJ();
            count = clonotype.getCount();
            freq = clonotype.getFreq();
        }

    }

    public ClonotypeWrapper clonotype;
    public List<AlignmentHelperResult> alignmentHelperList = new ArrayList<>();

    public IntersectResult(Clonotype clonotype, List<ClonotypeSearchResult> clonotypeSearchResults) {
        this.clonotype = new ClonotypeWrapper(clonotype);
        for (ClonotypeSearchResult clonotypeSearchResult : clonotypeSearchResults) {
            this.alignmentHelperList.add(new AlignmentHelperResult(clonotypeSearchResult));
        }
    }
}

