package server.results

import com.antigenomics.vdjtools.sample.Sample
import controllers.IntersectionAPI.IntersectParametersRequest
import server.database.GlobalDatabase
import server.wrappers.Filters
import server.wrappers.alignment.AlignmentHelperResultWrapper
import server.wrappers.database.{IntersectWrapper, RowWrapper}

import scala.collection.mutable

/**
  * Created by bvdmitri on 26.06.16.
  */
class IntersectResults(var pageSize: Int, var results: mutable.HashMap[String, List[IntersectWrapper]]) {
  def this() {
    this(IntersectResults.DEFAULT_PAGE_SIZE, mutable.HashMap())
  }

  def reinit(fileName: String, sample: Sample, parameters: IntersectParametersRequest, filters: Filters): Unit = {
    results += (fileName -> GlobalDatabase.intersect(sample, parameters, filters))
  }

  def getPage(fileName: String, page: Int): List[IntersectWrapper] = {
    results.get(fileName) match {
      case Some(list) =>
        if (page >= 0) {
          var fromIndex: Int = pageSize * page
          fromIndex = if (fromIndex > list.size) list.size else fromIndex
          var toIndex: Int = pageSize * (page + 1)
          toIndex = if (toIndex > list.size) list.size else toIndex
          list.slice(fromIndex, toIndex)
        } else {
          getPage(fileName, 0)
        }
      case None =>
        List()
    }
  }

  def getTotalItems(fileName: String): Int = {
    results.get(fileName) match {
      case Some(list) => list.size
      case None => 0
    }
  }

  def getHelperList(fileName: String, id: Int) : List[AlignmentHelperResultWrapper] = {
    results.get(fileName) match {
      case Some(list) =>
        val filteredList = list.filter((iw : IntersectWrapper) => iw.id == id)
        if (filteredList.nonEmpty) filteredList.head.alignmentHelperList else List()
      case None =>
        List()
    }
  }

  def sort(fileName: String, column: String, sortType: String): Unit = {
    if (results.get(fileName).isDefined) {
      results += (fileName -> results.get(fileName).get.sortWith((e1, e2) => {
        var m : Boolean = false
        column match {
          case "cdr3aa" =>
            val v1 = e1.clonotype.cdr.cdr3aa
            val v2 = e2.clonotype.cdr.cdr3aa
            m = v1 >= v2
          case "cdr3nt" =>
            val v1 = e1.clonotype.cdr.cdr3nt
            val v2 = e2.clonotype.cdr.cdr3nt
            m = v1 >= v2
          case "count" =>
            val v1 = e1.clonotype.count
            val v2 = e2.clonotype.count
            m = v1 >= v2
          case "freq" =>
            val v1 = e1.clonotype.freq
            val v2 = e2.clonotype.freq
            m =  v1 >= v2
          case "v" =>
            val v1 = e1.clonotype.v
            val v2 = e2.clonotype.v
            m = v1 >= v2
          case "j" =>
            val v1 = e1.clonotype.j
            val v2 = e2.clonotype.j
            m = v1 >= v2
          case "matches" =>
            val v1 = e1.alignmentHelperList.size
            val v2 = e2.alignmentHelperList.size
            m = v1 >= v2
          case _ =>
        }
        sortType match {
          case "desc" => m
          case "asc" => !m
          case _ => m
        }
      }))
    }
  }

  def defaultSort(fileName: String) = sort(fileName, IntersectResults.DEFAULT_SORT_COLUMN, IntersectResults.DEFAULT_SORT_TYPE)

}

object IntersectResults {
  val DEFAULT_PAGE_SIZE : Int = 25
  val DEFAULT_SORT_COLUMN : String = "count"
  val DEFAULT_SORT_TYPE : String = "desc"
}
