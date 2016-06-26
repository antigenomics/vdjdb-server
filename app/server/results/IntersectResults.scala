package server.results

import com.antigenomics.vdjtools.sample.Sample
import controllers.IntersectionAPI.IntersectParametersRequest
import play.api.libs.json.Json
import server.database.GlobalDatabase
import server.wrappers.Filters
import server.wrappers.database.{IntersectWrapper, RowWrapper}

/**
  * Created by bvdmitri on 26.06.16.
  */
class IntersectResults(var pageSize: Int, var results: List[IntersectWrapper]) {
  def this() {
    this(IntersectResults.DEFAULT_PAGE_SIZE, List())
  }

  def reinit(sample: Sample, parameters: IntersectParametersRequest, filters: Filters): Unit = {
    results = GlobalDatabase.intersect(sample, parameters, filters)
  }

  def getPage(page: Int): List[IntersectWrapper] = {
    if (page >= 0) {
      var fromIndex: Int = pageSize * page
      fromIndex = if (fromIndex > results.size) results.size else fromIndex
      var toIndex: Int = pageSize * (page + 1)
      toIndex = if (toIndex > results.size) results.size else toIndex
      results.slice(fromIndex, toIndex)
    } else {
      getPage(0)
    }
  }
}

object IntersectResults {
  val DEFAULT_PAGE_SIZE : Int = 25
}
