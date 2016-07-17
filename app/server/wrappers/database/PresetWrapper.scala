package server.wrappers.database

import com.antigenomics.vdjdb.scoring.SequenceSearcherPreset
import com.milaboratory.core.tree.TreeSearchParameters
import play.api.libs.json.Json
import server.Configuration

/**
  * Created by bvdmitri on 12.07.16.
  */
case class PresetWrapper(name: String, var mismatches: Int, var insertions: Int, var deletions: Int, var mutations: Int)

object PresetWrapper {
  implicit val presetWrapperWrites = Json.writes[PresetWrapper]

  def wrap(name: String, preset: SequenceSearcherPreset): PresetWrapper = {
    val parameters = preset.getParameters
    val mutations = parameters.getMaxSubstitutions
    val insertions = parameters.getMaxInsertions
    val deletions = parameters.getMaxDeletions
    var mismatches = mutations + insertions + deletions
    //TODO
    val allowedMismatches = 7
    if (mismatches > allowedMismatches) mismatches = allowedMismatches

    new PresetWrapper(name, mismatches, insertions, deletions, mutations)
  }
}
