package server.wrappers.alignment

import com.antigenomics.vdjdb.impl.ClonotypeSearchResult
import play.api.libs.json.Json
import server.wrappers.database.RowWrapper

/**
  * Created by bvdmitri on 22.06.16.
  */
case class AlignmentHelperResultWrapper(alignmentHelper: AlignmentHelperWrapper, row: RowWrapper, score: Float) {
  def this(csr: ClonotypeSearchResult) {
    this(new AlignmentHelperWrapper(csr.getResult.getAlignmentHelper), RowWrapper.wrap(csr.getRow), csr.getResult.getScore)
  }
}

object AlignmentHelperResultWrapper {
  implicit val alignmentHelperResultWrapperWrites = Json.writes[AlignmentHelperResultWrapper]
}
