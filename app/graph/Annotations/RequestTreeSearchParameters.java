package graph.Annotations;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.milaboratory.core.tree.TreeSearchParameters;

/**
 * Created by bvdmitri on 14.10.15.
 */

@JsonIgnoreProperties(ignoreUnknown = true)
public class RequestTreeSearchParameters {
    public Boolean ignore;
    public Boolean jMatch;
    public Boolean vMatch;
    public Integer mismatches;
    public Integer deletions;
    public Integer insertions;
    public Integer totalMutations;

    public TreeSearchParameters getTreeSearchParameters() {
        return new TreeSearchParameters(mismatches, deletions, insertions, totalMutations);
    }

    public Boolean isParametersEquals(CachedAnnotations annotationCache) {
        return ignore ||
                annotationCache.jMatch.equals(jMatch) &&
                        annotationCache.vMatch.equals(vMatch) &&
                        annotationCache.deletions.equals(deletions) &&
                        annotationCache.insertions.equals(insertions) &&
                        annotationCache.mismatches.equals(mismatches) &&
                        annotationCache.totalMutations.equals(totalMutations);
    }
}
