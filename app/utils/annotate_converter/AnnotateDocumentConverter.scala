package utils.annotate_converter

import java.io.FileOutputStream
import server.results.IntersectResults
import org.apache.poi.hssf.usermodel.HSSFWorkbook
import org.apache.poi.ss.usermodel.Workbook
import server.database.GlobalDatabase
import utils.CommonUtils

/**
  * Created by bvdmitri on 05.10.16.
  */

trait AnnotateDocumentConverter {
  def convert(fileName: String, intersectResults: IntersectResults) : Option[String] = None
  def getExtension : String = ".txt"
}

object AnnotateDocumentConverter {
  def get(exportType: String) : Option[AnnotateDocumentConverter] = {
    exportType match {
      case "excel" => Some(new AnnotateExcelConverter())
      case _ => None
    }
  }
  def getExtension(exportType: String) : String = {
    exportType match {
      case "excel" => new AnnotateExcelConverter().getExtension
      case _ => ".txt"
    }
  }
}
