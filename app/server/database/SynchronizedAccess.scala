package server.database

import java.util.concurrent.locks.{Lock, ReentrantReadWriteLock}

trait SynchronizedAccess {

  import SynchronizedAccess._

  protected val instanceLock: ReentrantReadWriteLock =
    new ReentrantReadWriteLock()

  protected val instanceReadLock: ReadLock =
    new ReadLock(instanceLock.readLock())

  protected val instanceReadWriteLock: ReadWriteLock =
    new ReadWriteLock(instanceLock.readLock(), instanceLock.writeLock())

  protected case class Synchronized[T](private var value: T) {

    def apply()(implicit readLock: ReadLock): T = {
      validateLock(readLock, instanceReadLock, instanceReadWriteLock)
      value
    }

    def update(newValue: T)(implicit readWriteLock: ReadWriteLock): Unit = {
      validateLock(readWriteLock, instanceReadWriteLock)
      value = newValue
    }

    private def validateLock(lock: TypedLock, allowedLocks: TypedLock*): Unit = {
      require(allowedLocks.contains(lock), "cannot be accessed from another synchronization scope")
      require(lock.tryLock(), "cannot be accessed out of a synchronization scope")
      lock.unlock()
    }

  }

  protected def synchronizeRead[T](body: ReadLock => T): T =
    synchronizeOperation(instanceReadLock)(body)

  protected def synchronizeReadWrite[T](body: ReadWriteLock => T): T =
    synchronizeOperation(instanceReadWriteLock)(body)

  protected def synchronizeOperation[T, L <: TypedLock](lock: L)(body: L => T): T = {
    lock.lock()
    try { body(lock) }
    finally { lock.unlock() }
  }

}

object SynchronizedAccess {

  sealed trait TypedLock {

    protected val instance: Lock

    def lock(): Unit = instance.lock()

    def unlock(): Unit = instance.unlock()

    def tryLock(): Boolean = instance.tryLock()

  }

  sealed class ReadLock(readLock: ReentrantReadWriteLock.ReadLock) extends TypedLock {

    override protected val instance: Lock = readLock

  }

  sealed class ReadWriteLock
  (readLock: ReentrantReadWriteLock.ReadLock,
   writeLock: ReentrantReadWriteLock.WriteLock)
    extends ReadLock(readLock) {

    override protected val instance: Lock = writeLock

  }

}
