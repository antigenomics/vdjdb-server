package server.wrappers.database

import com.antigenomics.vdjdb.db.Column
import play.api.libs.json.Json

/**
  * Created by bvdmitri on 22.06.16.
  */
case class ColumnMetadataWrapper(columnType: String, visible: String, searchable: String, dataType: String, title: String, comment: String) {
  def this(c: Column) {
    this(c.getMetadata.get("type"), c.getMetadata.get("visible"), c.getMetadata.get("searchable"),
      c.getMetadata.get("data.type"), c.getMetadata.get("title"), c.getMetadata.get("comment"))
  }
}

object ColumnMetadataWrapper {
  implicit val columnMetadataWrapperWrites = Json.writes[ColumnMetadataWrapper]
}
