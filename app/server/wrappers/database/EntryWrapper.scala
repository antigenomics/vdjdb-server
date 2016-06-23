package server.wrappers.database

import com.antigenomics.vdjdb.db.Entry
import play.api.libs.json.Json

/**
  * Created by bvdmitri on 22.06.16.
  */

case class EntryWrapper(columnName: String, value: String) {
  def this(e: Entry) {
    this(e.getColumn.getName, e.getValue)
  }
}

object EntryWrapper {
  implicit val entryWrapperWrites = Json.writes[EntryWrapper]
}
