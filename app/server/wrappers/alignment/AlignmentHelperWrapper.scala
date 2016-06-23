package server.wrappers.alignment

import com.milaboratory.core.alignment.AlignmentHelper
import play.api.libs.json.Json

/**
  * Created by bvdmitri on 22.06.16.
  */
case class AlignmentHelperWrapper(seq1String: String, markup: String, seq2String: String) {
  def this(a: AlignmentHelper) {
    this(a.getSeq1String, a.getMarkup, a.getSeq2String)
  }
}

object AlignmentHelperWrapper {
  implicit val alignmentHelperWrapperWrites = Json.writes[AlignmentHelperWrapper]
}