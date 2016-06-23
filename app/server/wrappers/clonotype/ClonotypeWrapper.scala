package server.wrappers.clonotype

import com.antigenomics.vdjtools.sample.Clonotype
import play.api.libs.json.Json


/**
  * Created by bvdmitri on 22.06.16.
  */
case class ClonotypeWrapper(cdr: CDR3Wrapper, v: String, j: String, count: Long, freq: Double) {
  def this(c: Clonotype) {
    this(new CDR3Wrapper(c), c.getV, c.getJ, c.getCount, c.getFreq)
  }
}

object ClonotypeWrapper {
  implicit val clonotypeWrapperWrites = Json.writes[ClonotypeWrapper]
}
