package server.wrappers.database

import com.antigenomics.vdjdb.db.Row
import play.api.libs.json.Json

import scala.collection.mutable.ListBuffer

/**
  * Created by bvdmitri on 22.06.16.
  */
case class RowWrapper(entries: List[EntryWrapper])

object RowWrapper {
  implicit val rowWrapperWrites = Json.writes[RowWrapper]

  def wrap(r: Row): RowWrapper = {
    var buffer = new ListBuffer[EntryWrapper]()
    for (entry <- r.getEntries) {
      buffer += new EntryWrapper(entry)
    }
    RowWrapper(buffer.toList)
  }
}
