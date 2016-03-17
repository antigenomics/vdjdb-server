package server

import com.antigenomics.vdjdb.VdjdbInstance

/**
  * Created by bvdmitri on 16.03.16.
  */
class GlobalDatabase {}
object GlobalDatabase {
  lazy val db = new VdjdbInstance()
}
