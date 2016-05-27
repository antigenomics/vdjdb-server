package server

import java.io.FileInputStream
import java.util

import com.antigenomics.vdjdb.VdjdbInstance
import com.antigenomics.vdjdb.db.{Column, Database, DatabaseSearchResult, SearchResult}
import com.antigenomics.vdjdb.Util.checkDatabase
import com.antigenomics.vdjdb.impl.ClonotypeSearchResult
import com.antigenomics.vdjdb.sequence.SequenceFilter
import com.antigenomics.vdjdb.text.TextFilter
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

  def intersect(sample: Sample, parameters: IntersectParametersRequest, textFilters : util.ArrayList[TextFilter], sequenceFilters: util.ArrayList[SequenceFilter]) =
    synchronizeRead { implicit lock =>
      //val clonotypeDatabase = db().asClonotypeDatabase()
      //clonotypeDatabase.search(sample)
      val searchResults = db().getDbInstance.search(textFilters, sequenceFilters).asInstanceOf[util.ArrayList[SearchResult]]
      if (searchResults.size() != 0) {
        new VdjdbInstance(Database.create(searchResults)).asClonotypeDatabase(parameters.matchV, parameters.matchJ,
          parameters.maxMismatches, parameters.maxInsertions, parameters.maxDeletions, parameters.maxMutations).search(sample)
      } else {
        null
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
