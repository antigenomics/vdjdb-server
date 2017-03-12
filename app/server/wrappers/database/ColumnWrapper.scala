package server.wrappers.database

import com.antigenomics.vdjdb.db.Column
import com.antigenomics.vdjdb.text.TextColumn
import play.api.libs.json.Json

import scala.collection.mutable.ListBuffer
import scala.collection.JavaConversions._

/**
  * Created by bvdmitri on 22.06.16.
  */
case class ColumnWrapper(name: String, metadata: ColumnMetadataWrapper, autocomplete: Boolean, values: List[String])

object ColumnWrapper {
  implicit val columnWrapperWrites = Json.writes[ColumnWrapper]

  def wrap(column: Column): ColumnWrapper = {
    var autocomplete : Boolean= false
    var values : ListBuffer[String] = ListBuffer[String]()
    if (column.getMetadata.containsKey("searchable") && column.getMetadata.get("searchable") == "1") {
      if (column.getMetadata.containsKey("autocomplete") && column.getMetadata.get("autocomplete") == "1") {
        autocomplete = true
        column.getValues.toList.foreach(value => {
          values += value
        })
      }
    }
    ColumnWrapper(column.getName, new ColumnMetadataWrapper(column), autocomplete, values.toList)
  }
}
