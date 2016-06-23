package server.wrappers.clonotype

import com.antigenomics.vdjtools.sample.Clonotype
import play.api.libs.json.Json

/**
  * Created by bvdmitri on 22.06.16.
  */

case class CDR3Wrapper(cdr3aa: String, cdr3nt: String, vend: Int, jstart: Int, dstart: Int, dend: Int) {
  def this(c: Clonotype) {
    this(c.getCdr3aa, c.getCdr3nt, c.getVEnd, c.getJStart, c.getDStart, c.getDEnd)
  }
}

object CDR3Wrapper {
  implicit val cdr3WrapperWrites = Json.writes[CDR3Wrapper]
}
