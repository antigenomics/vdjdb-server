.. _api:

VDJdb server REST API **[BETA]**
--------------------------------

Accessing metadata
^^^^^^^^^^^^^^^^^^

Information on database columns (such as their IDs, names and other metadata) can
be obtaining by performing a GET request to ``https://vdjdb.cdr3.net/search/columns``.

For example,

.. code:: bash

	curl -X GET https://vdjdb.cdr3.net/search/columns

will return a JSON object with the following structure.

.. code:: json

	[
		...
		{
			"name":"gene",
			"metadata" : {
				"columnType": "txt",
				"visible" : "1",
				"searchable" : "1"
				"dataType" : "factor",
				"title": "Gene",
				"comment" : "TCR chain: alpha or beta.",
			},
			"autocomplete" : true,
			"values" : [ "TRA" , "TRB" ]
		}
		...
	]


Searching the database
^^^^^^^^^^^^^^^^^^^^^^

You can query the database by sending a POST request with a specific JSON content to ``https://vdjdb.cdr3.net/search``.

The structure of JSON query is the following:

.. code:: json

    {
        "textFilters": [
            ...
        ],
        "sequenceFilters": [
            ...
        ]
    }


Where the **textFilters** structure is

.. code:: json

    {
        "columnId": "(string)",     // Column name (any available column)
        "value": "(string)",        // Search value
        "filterType": "(string)",   // Filter type: exact, exact_set, pattern, substring_set, level
        "negative": (boolean)       // Return only results that do not match the filter
    }


and the **sequenceFilters** structure is

.. code:: json

    {
        "columnId": "(string)",     // Column name (cdr3 or antigen.epitope)
        "query": "(string)",        // Search query
        "substitutions": (int),     // The number of substitutions
        "insertions": (int),        // The number of insertions
        "deletions": (int),         // The number of deletions
        "total": (int)              // Total number of mutations allowed
    }

Sequence filters can only be applied to columns with ``"columnType": "seq"`` and will invoke a search and alignment procedure
(more precisely, a sequence tree search). Text filters can be specified for any available column.

.. note::
    Filters mirror the filtering functions implemented in VDJdb-standalone.
    Thus, parameter description can be found in the documentation of ``*Filter.groovy`` classes implemented for
    `sequence <https://github.com/antigenomics/vdjdb-standalone/tree/master/src/main/groovy/com/antigenomics/vdjdb/sequence>`__ and
    `text <https://github.com/antigenomics/vdjdb-standalone/blob/master/src/main/groovy/com/antigenomics/vdjdb/text>`__ columns respectively.

The structure of JSON response is the following:

.. code:: json

	[
		...
		{
			"entries": [
				...
				{ "columnName": "gene", "value": "TRA" }
				...
			]
		}
		...
	]

For example, the following request

.. code:: bash

	curl -H "Content-Type: application/json" -X POST -d '{ "textFilters" : [{"columnId":"cdr3", "value":"CAAAASGGSYIPTF", "filterType":"exact", "negative":false }], "sequenceFilters" : [] }' https://vdjdb.cdr3.net/search

will produce

.. code:: json

	[{
    	"entries": [{
        	"columnName": "complex.id",
        	"value": "131"
    	}, {
        	"columnName": "gene",
        	"value": "TRA"
    	}, {
        	"columnName": "cdr3",
        	"value": "CAAAASGGSYIPTF"
    	}, {
        	"columnName": "v.segm",
        	"value": "TRAV1-2*01"
    	}, {
        	"columnName": "j.segm",
        	"value": "TRAJ6*01"
    	}, {
        	"columnName": "species",
        	"value": "HomoSapiens"
    	}, {
        	"columnName": "mhc.a",
        	"value": "HLA-B*35:01"
    	}, {
        	"columnName": "mhc.b",
        	"value": "B2M"
    	}, {
        	"columnName": "mhc.class",
        	"value": "MHCI"
    	}, {
        	"columnName": "antigen.epitope",
        	"value": "EPLPQGQLTAY"
    	}, {
        	"columnName": "antigen.gene",
        	"value": "BZLF1"
    	}, {
        	"columnName": "antigen.species",
        	"value": "EBV"
    	}, {
        	"columnName": "reference.id",
        	"value": "PMID:16148129"
    	}, {
        	"columnName": "method",
        	"value": "{\"frequency\": \"4/4\", \"identification\": \"antigen-loaded-targets\", \"sequencing\": \"sanger\", \"singlecell\": \"\", 	\"verification\": \"antigen-loaded-targets,tetramer-stain\"}"
    	}, {
        	"columnName": "meta",
        	"value": "{\"cell.subset\": \"CD8+\", \"clone.id\": \"MW2\", \"donor.MHC\": \"HLA-B*35:01\", \"donor.MHC.method\": \"sequencing\", \"epitope.id\": \"\", \"replica.id\": \"\", \"samples.found\": 1, \"structure.id\": \"\", \"studies.found\": 1, \"study.id\": \"\", \"subject.cohort\": \"healthy\", \"subject.id\": \"\", \"tissue\": \"CTL culture\"}"
    	}, {
        	"columnName": "cdr3fix",
        	"value": "{\"cdr3\": \"CAAAASGGSYIPTF\", \"cdr3_old\": \"CAAAASGGSYIPTF\", \"fixNeeded\": false, \"good\": true, \"jCanonical\": true, \"jFixType\": \"NoFixNeeded\", \"jId\": \"TRAJ6*01\", \"jStart\": 4, \"vCanonical\": true, \"vEnd\": 2, \"vFixType\": \"NoFixNeeded\", \"vId\": \"TRAV1-2*01\"}"
    	}, {
        	"columnName": "vdjdb.score",
        	"value": "3"
    	}, {
        	"columnName": "web.method",
        	"value": "culture"
    	}, {
        	"columnName": "web.method.seq",
        	"value": "sanger"
    	}, {
        	"columnName": "web.cdr3fix.nc",
        	"value": "no"
    	}, {
        	"columnName": "web.cdr3fix.unmp",
        	"value": "no"
    	}]
	}]

.. note:: Column description can be found `here <https://github.com/antigenomics/vdjdb-db#database-specification>`__.

.. warning:: The columns ``method``, ``meta``, ``cdr3fix``, ``web.method``, ``web.method.seq`` are likely to be removed in the future.
