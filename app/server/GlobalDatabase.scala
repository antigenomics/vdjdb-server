package server

import java.io.FileInputStream
import java.util

import com.antigenomics.vdjdb.VdjdbInstance
import com.antigenomics.vdjdb.db.Database
import com.antigenomics.vdjdb.Util.checkDatabase
import com.antigenomics.vdjdb.sequence.SequenceFilter
import com.antigenomics.vdjdb.text.TextFilter
import com.antigenomics.vdjtools.sample.Sample
import controllers.IntersectionAPI.IntersectParametersRequest
import utils.SynchronizedAccess

/**
  * Created by bvdmitri on 16.03.16.
  */
object GlobalDatabase extends SynchronizedAccess {
  private var db : Synchronized[VdjdbInstance] = Synchronized(new VdjdbInstance(new FileInputStream("/Users/mikesh/Programming/vdjdb-server/database/vdjdb.meta.txt"),
                                                                                new FileInputStream("/Users/mikesh/Programming/vdjdb-server/database/vdjdb.txt")))

  def search(textFilters : util.ArrayList[TextFilter], sequenceFilters: util.ArrayList[SequenceFilter]) =
    synchronizeRead { implicit lock =>
      db().getDbInstance.search(textFilters, sequenceFilters)
    }

  def intersect(sample: Sample, parameters: IntersectParametersRequest) =
    synchronizeRead { implicit lock =>
      val clonotypeDatabase = VdjdbInstance.asClonotypeDatabase(db().getDbInstance, parameters.matchV, parameters.matchV,
        parameters.maxMismatches, parameters.maxInsertions, parameters.maxDeletions, parameters.maxMutations)
      clonotypeDatabase.search(sample)
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
