.. VDJdb documentation master file, created by
   sphinx-quickstart on Tue Aug 15 16:50:45 2017.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

VDJdb: TCR specificity database web browser
===========================================

*VDJdb* is a curated database of T-cell receptor (TCR) sequences with known antigen specificities. The primary goal of VDJdb is to facilitate access to existing information on T-cell receptor antigen specificities, i.e. the ability to recognize certain epitopes in a certain MHC contexts.

Our mission is to both aggregate the scarce TCR specificity information available so far and to create a curated repository to store such data. In addition to routine database updates providing the most up-to-date information fetched from recently published studies utilizing TCR specificity assays, we make our best to ensure data consistency and correct irregularities in TCR specificity reporting with a complex database validation scheme:

We take into account all available information on experimental setup used to identify antigen-specific TCR sequences and assign a single confidence score to highligh most reliable records at the database generation stage.
Each database record is also automatically checked against a database of V/J segment germline sequences to ensure standardized and consistent reporting of V-J junctions and CDR3 sequences that define T-cell clones.

The `web application <https://vdjdb.cdr3.net>`__ can be used to browse and query the database, providing an intuitive interface for database navigation. Additionally, it can be used to query immune repertoire sequencing (RepSeq) samples against the database and generate sample-level summary of detected antigen specificities.

Table of Contents
-----------------

.. toctree::
   :maxdepth: 2

   install
   api
