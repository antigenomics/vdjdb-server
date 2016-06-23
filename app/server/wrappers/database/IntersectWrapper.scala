package server.wrappers.database

import com.antigenomics.vdjdb.impl.ClonotypeSearchResult
import com.antigenomics.vdjtools.sample.Clonotype
import play.api.libs.json.Json
import server.wrappers.alignment.AlignmentHelperResultWrapper
import server.wrappers.clonotype.ClonotypeWrapper
import scala.collection.mutable.ListBuffer
import scala.collection.JavaConversions._


/**
  * Created by bvdmitri on 22.06.16.
  */
case class IntersectWrapper(clonotype: ClonotypeWrapper, alignmentHelperList: List[AlignmentHelperResultWrapper])

object IntersectWrapper {
  implicit val intersectWrapperWrites = Json.writes[IntersectWrapper]

  def wrap(c: Clonotype, csrList: java.util.List[ClonotypeSearchResult]): IntersectWrapper = {
    val buffer = new ListBuffer[AlignmentHelperResultWrapper]
    csrList.toList.foreach(csr => {
      buffer += new AlignmentHelperResultWrapper(csr)
    })
    new IntersectWrapper(new ClonotypeWrapper(c), buffer.toList)
  }
}
