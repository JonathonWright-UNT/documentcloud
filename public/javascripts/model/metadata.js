// Metadata Model

// A Metadatum, on the client, should be the aggregate of all of the occurrences
// of a particular entity in the currently-viewed documents. To that end,
// it has an averageRelevance() over its documents()...
dc.model.Metadatum = dc.Model.extend({

  // Create a new metadatum from an instance(s) raw object.
  // Generally, you'll want to make 'em through Metadata.addOrCreate() instead.
  constructor : function(instances) {
    var instances = _.flatten([instances]);
    var id = dc.model.Metadatum.generateId(instances[0]);
    this.instanceCount = instances.length;
    this.base({
      instances : instances,
      id : id,
      value : instances[0].value,
      kind : instances[0].kind
    });
  },

  // Adds a document-instance of the metadatum to this object.
  addInstance : function(instance) {
    this.get('instances').push(instance);
    this.instanceCount++;
    delete this._docIds;
    return instance;
  },

  // Look up and cache the set of document_ids from the metadata instances.
  documentIds : function() {
    return this._docIds = this._docIds || _.pluck(this.get('instances'), 'document_id');
  },

  // Just give us the first id that comes to mind.
  firstId : function() {
    return this.documentIds()[0];
  },

  // Return a list of all of the currently-loaded documents referencing this
  // Metadatum.
  documents : function() {
    return _(this.documentIds()).map(function(id){ return Documents.get(id); });
  },

  // Compute the average relevance of this Metadatum to the currently loaded
  // set of Documents.
  averageRelevance : function() {
    return this.totalRelevance() / this.instanceCount;
  },

  // Compute the total relevance of this Metadatum (metadata occurring in more
  // documents will have a higher score).
  totalRelevance : function() {
    return _.inject(this.get('instances'), 0, function(sum, instance) {
      return sum + instance.relevance;
    });
  },

  // Truncate the total relevance for display.
  displayTotalRelevance : function() {
    return this.totalRelevance().toString().substring(0, 5);
  },

  // Display-ready version of the metadata kind.
  displayKind : function() {
    return Inflector.capitalize(Inflector.pluralize(Inflector.spacify(this.get('kind'))));
  },

  // Display-ready version of the entity title.
  displayTitle : function() {
    return Inflector.capitalize(Inflector.spacify(this.get('kind'))) + ": " + this.get('value');
  },

  // Return the string that one would use to perform a fielded search for this
  // metadatum.
  toSearchQuery : function() {
    var val = this.get('value'), kind = this.get('kind');
    if (val.match(/\s/)) val = '"' + val + '"';
    return kind + ":" + val;
  },

  // Inspect.
  toString : function() {
    return 'Metadatum "' + this.get('instances')[0].value + '" ' + this.id;
  }

}, {

  // Generate the canonical client id for a kind, and calais hash or value pair.
  generateId : function(attributes) {
    var value = (attributes.calais_id || attributes.value).replace(/\W/g, '');
    return attributes.kind + ':' + value;
  }

});


// Metadata Set

dc.model.MetadataSet = dc.model.SortedSet.extend({

  // Map of kind to display name for titles and the like.
  DISPLAY_NAME : {
    city          : 'Cities',
    country       : 'Countries',
    date          : 'Dates',
    organization  : 'Organizations',
    person        : 'People',
    place         : 'Places',
    state         : 'States',
    term          : 'Terms'
  },

  // Metadata are kept sorted by totalRelevance() of each datum, across its
  // documents.
  comparator : function(m) {
    return m.get('value').toLowerCase();
  },

  // Populate the Metadata set from the current documents in the client,
  // triggering a refresh when loaded.
  populate : function(callback) {
    dc.ui.spinner.show('loading');
    $.get('/documents/metadata.json', {'ids[]' : Documents.getIds()}, function(resp) {
      _.each(resp.metadata, function(m){ Metadata.addOrCreate(m); });
      Metadata.sort();
      dc.ui.spinner.hide();
      callback();
    }, 'json');
  },

  // Returns the sorted list of metadata for the currently-selected documents.
  // If "ensure" is passed, return all Metadata when no documents are selected.
  selected : function(ensure) {
    var docIds = Documents.selectedIds();
    if (docIds.length <= 0) return ensure ? this.models() : [];
    return _(this.models()).select(function(meta){
      return _(meta.documentIds()).any(function(id){ return _(docIds).include(id); });
    });
  },

  addOrCreate : function(obj) {
    var id = dc.model.Metadatum.generateId(obj);
    var meta = this.get(id);
    return meta ? meta.addInstance(obj) : this.add(new dc.model.Metadatum(obj));
  },

  toString : function() {
    return 'Metadata ' + this.base();
  }

});

window.Metadata = new dc.model.MetadataSet();