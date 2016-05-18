package controllers

import java.io.{File, PrintWriter}

import models.auth.User
import org.eclipse.jgit.api.Git
import org.eclipse.jgit.internal.storage.file.FileRepository
import org.eclipse.jgit.lib.Repository
import org.eclipse.jgit.transport.UsernamePasswordCredentialsProvider
import utils.CommonUtils

/**
  * Created by bvdmitri on 30.03.16.
  */
object GithubAPI {
    private val REPO_URL: String = "https://github.com/bvdmitri/git-test"
    private val TMP_DIRECTORY: String = "/tmp/"
    private val GITHUB_TOKEN: String = "deleted"

    def createBranch(user: User, file: File, defbranchName: String, fileName: String): String = {
      val repoDirectory: String = TMP_DIRECTORY + CommonUtils.randomAlphaString(5)
      Git.cloneRepository.setURI(REPO_URL).setDirectory(new File(repoDirectory)).call
      file.renameTo(new File(repoDirectory + "/" + fileName))
      val localRepo: Repository = new FileRepository(repoDirectory + "/.git")
      val git: Git = new Git(localRepo)
      val branchName: String = CommonUtils.randomAlphaString(5) + "_" + defbranchName + "_" + user.getEmail
      git.checkout.setCreateBranch(true).setName(branchName).call
      git.add.addFilepattern(".").call
      git.commit.setMessage("commit").call
      git.push.setCredentialsProvider(new UsernamePasswordCredentialsProvider("token", GITHUB_TOKEN)).call
      REPO_URL + "/branches"
    }
}
