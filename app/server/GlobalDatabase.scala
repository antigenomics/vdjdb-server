package server

import java.io.FileInputStream
import java.util

import com.antigenomics.vdjdb.VdjdbInstance
import com.antigenomics.vdjdb.db.{Column, Database, DatabaseSearchResult, SearchResult}
import com.antigenomics.vdjdb.Util.checkDatabase
import com.antigenomics.vdjdb.impl.ClonotypeSearchResult
import com.antigenomics.vdjdb.sequence.SequenceFilter
import com.antigenomics.vdjdb.text.{ExactTextFilter, TextFilter}
import com.antigenomics.vdjtools.sample.{Clonotype, Sample}
import controllers.IntersectionAPI.IntersectParametersRequest
import controllers.SearchAPI.FiltersRequest
import utils.SynchronizedAccess

/**
  * Created by bvdmitri on 16.03.16.
  */
object GlobalDatabase extends SynchronizedAccess {
  private var db : Synchronized[VdjdbInstance] = null

  def initDatabase(): Unit = {
    if (Configuration.useLocalDatabase) {
      db = Synchronized(new VdjdbInstance(new FileInputStream(Configuration.databasePath + "vdjdb.meta.txt"),
        new FileInputStream(Configuration.databasePath + "vdjdb.txt")))
    } else {
      update()
    }
  }

  def search(textFilters : util.ArrayList[TextFilter], sequenceFilters: util.ArrayList[SequenceFilter]) =
    synchronizeRead { implicit lock =>
      db().getDbInstance.search(textFilters, sequenceFilters)
    }

  def search() =
    synchronizeRead { implicit lock =>
      val textFilters : util.ArrayList[TextFilter] = new util.ArrayList[TextFilter]()
      val sequenceFilters : util.ArrayList[SequenceFilter] = new util.ArrayList[SequenceFilter]()
      db().getDbInstance.search(textFilters, sequenceFilters)
    }

  def findComplexes(complexId: String, gene: String) =
    synchronizeRead { implicit lock =>
      val textFilters : util.ArrayList[TextFilter] = new util.ArrayList[TextFilter]()
      textFilters.add(new ExactTextFilter("complex.id", complexId, false))
      textFilters.add(new ExactTextFilter("gene", gene, true))
      val sequenceFilters : util.ArrayList[SequenceFilter] = new util.ArrayList[SequenceFilter]()
      db().getDbInstance.search(textFilters, sequenceFilters)
    }

  def intersect(sample: Sample, parameters: IntersectParametersRequest, filters: Filters) =
    synchronizeRead { implicit lock =>
      val searchResults = db().getDbInstance.search(filters.textFilters, filters.sequenceFilters).asInstanceOf[util.ArrayList[SearchResult]]
      if (searchResults.size() != 0) {
        Some(new VdjdbInstance(Database.create(searchResults)).asClonotypeDatabase(parameters.matchV, parameters.matchJ,
          parameters.maxMismatches, parameters.maxInsertions, parameters.maxDeletions, parameters.maxMutations).search(sample))
      } else {
        None
      }
    }

  def isParametersValid(parameters: IntersectParametersRequest): Boolean = {
    (parameters.maxDeletions <= 2 && parameters.maxDeletions >= 0) &&
      (parameters.maxInsertions <= 2 && parameters.maxInsertions >= 0) &&
        (parameters.maxMismatches <= 5 && parameters.maxMismatches >= 0) &&
         (parameters.maxMutations <= 5 && parameters.maxMutations >= 0)
  }

  def testComplexes() =
    synchronizeRead { implicit lock =>
      val textFilters : util.ArrayList[TextFilter] = new util.ArrayList[TextFilter]()
      val sequenceFilters : util.ArrayList[SequenceFilter] = new util.ArrayList[SequenceFilter]()
      for (i <- 1 to 1000) {
        textFilters.clear()
        textFilters.add(new ExactTextFilter("complex.id", String.valueOf(i), false))
        val result = db().getDbInstance.search(textFilters, sequenceFilters)
        if (result.size() == 1) {
          println("WARN: complexID " + i)
        }
      }
  }

  def getDatabase() =
    synchronizeRead { implicit lock =>
      db().getDbInstance
    }

  def getColumns() =
    synchronizeRead { implicit lock =>
      db().getDbInstance.getColumns
    }

  def update() =
    synchronizeReadWrite { implicit lock =>
      if (checkDatabase(true)) {
        db = Synchronized(new VdjdbInstance())
      }
    }
}
