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

    public RequestTreeSearchParameters() {}

    public RequestTreeSearchParameters(Boolean ignore, Boolean jMatch, Boolean vMatch, Integer mismatches, Integer deletions, Integer insertions, Integer totalMutations) {
        this.ignore = ignore;
        this.jMatch = jMatch;
        this.vMatch = vMatch;
        this.mismatches = mismatches;
        this.deletions = deletions;
        this.insertions = insertions;
        this.totalMutations = totalMutations;
    }

    public TreeSearchParameters getTreeSearchParameters() {
        return new TreeSearchParameters(mismatches, deletions, insertions, totalMutations);
    }

    public Boolean isParametersEquals(RequestTreeSearchParameters parameters) {
        return ignore ||
                parameters.jMatch.equals(jMatch) &&
                        parameters.vMatch.equals(vMatch) &&
                        parameters.deletions.equals(deletions) &&
                        parameters.insertions.equals(insertions) &&
                        parameters.mismatches.equals(mismatches) &&
                        parameters.totalMutations.equals(totalMutations);
    }

    public static RequestTreeSearchParameters defaultParameters() {
        return new RequestTreeSearchParameters(true, false, false, 2, 1, 1, 2);
    }
}
