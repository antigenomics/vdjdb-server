package models.file;

import models.auth.User;

import javax.persistence.Entity;

/**
 * Created by bvdmitri on 23.03.16.
 */

@Entity
public class BranchFile extends ServerFile {

    private String branchName;
    private Boolean merged = false;
    private Boolean rejected = false;
    private String link;

    public BranchFile(User user, String fileName, String uniqueName, String directoryPath, String filePath, String branchName, String link) {
        super(user, fileName, uniqueName, directoryPath, filePath);
        this.branchName = branchName;
        this.link = link;
    }

    public String getLink() {
        return link;
    }

    public String getBranchName() {
        return branchName;
    }

    public Boolean isMerged() {
        return merged;
    }

    public Boolean isRejected() {
        return rejected;
    }
}
