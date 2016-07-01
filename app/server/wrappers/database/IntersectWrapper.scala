package server.wrappers.database

import com.antigenomics.vdjdb.impl.ClonotypeSearchResult
import com.antigenomics.vdjtools.sample.Clonotype
import play.api.libs.json.{JsValue, Json, Writes}
import server.wrappers.alignment.AlignmentHelperResultWrapper
import server.wrappers.clonotype.ClonotypeWrapper

import scala.collection.mutable.ListBuffer
import scala.collection.JavaConversions._


/**
  * Created by bvdmitri on 22.06.16.
  */
case class IntersectWrapper(id: Int, clonotype: ClonotypeWrapper, alignmentHelperList: List[AlignmentHelperResultWrapper])

object IntersectWrapper {
  implicit val intersectWrapperWrites = new Writes[IntersectWrapper] {
    override def writes(o: IntersectWrapper): JsValue = Json.obj(
      "clonotype" -> o.clonotype,
      "matches" -> o.alignmentHelperList.size,
      "id" -> o.id
    )
  }

  def wrap(id: Int, c: Clonotype, csrList: java.util.List[ClonotypeSearchResult]): IntersectWrapper = {
    val buffer = new ListBuffer[AlignmentHelperResultWrapper]
    csrList.toList.foreach(csr => {
      buffer += new AlignmentHelperResultWrapper(csr)
    })
    new IntersectWrapper(id, new ClonotypeWrapper(c), buffer.toList)
  }
}
