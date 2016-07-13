package server.wrappers.database

import com.antigenomics.vdjdb.scoring.SequenceSearcherPreset
import com.milaboratory.core.tree.TreeSearchParameters
import play.api.libs.json.Json
import server.Configuration

/**
  * Created by bvdmitri on 12.07.16.
  */
case class PresetWrapper(name: String, var mismatches: Int, var insertions: Int, var deletions: Int, var mutations: Int, var threshold: Double)

object PresetWrapper {
  implicit val presetWrapperWrites = Json.writes[PresetWrapper]

  def wrap(name: String, preset: SequenceSearcherPreset, annotations: Boolean = false): PresetWrapper = {
    if (!annotations) {
      val parameters = preset.getParameters
      val mutations = parameters.getMaxSubstitutions
      val insertions = parameters.getMaxInsertions
      val deletions = parameters.getMaxDeletions
      var mismatches = mutations + insertions + deletions
      val allowedMismatches = Configuration.dbBrowseSequenceFilterOptions.get(3)
      if (mismatches > allowedMismatches) mismatches = allowedMismatches
      val threshold = preset.getScoring.getScoreThreshold
      new PresetWrapper(name, mismatches, insertions, deletions, mutations, threshold)
    } else {
      val allowedOptions = Configuration.annotationsBrowseSequenceFilterOptions
      val mutations = allowedOptions.get(0)
      val insertions = allowedOptions.get(1)
      val deletions = allowedOptions.get(2)
      val mismatches = allowedOptions.get(3)
      val threshold = preset.getScoring.getScoreThreshold
      new PresetWrapper(name, mismatches, insertions, deletions, mutations, threshold)
    }
  }
}
