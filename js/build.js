(function () {
  var forms = {};
  var globalEditModeEnabled = true;

  $('.fl-form').each(function () {
    var connection;
    var $form = $(this);
    var $formHtml = $form.find('.form-html');
    var $formResult = $form.find('.form-result');
    var data = Fliplet.Widget.getData($form.data('form-id'));
    var uuid = $form.data('form-uuid');
    var editModeEnabled = true;
    var dataSourceId;
    var dataSourceEntryId;

    var formInstance = {
      el: this,
      data: data,
      connection: connection,
      fillForm: fillForm
    };

    forms[uuid] = formInstance;

    function getConnection() {
      if (!connection) {
        connection = Fliplet.DataSources.connect(data.dataSourceId);
      }

      return connection;
    }

    $form.submit(function (event) {
      event.preventDefault();
      var errors = false;
      $form.find('[required]').each(function () {
        var $el = $(this);
        if ( !$el.val().length ) {
          errors = true;
          $el.addClass('has-error');
        }
      });

      if (!errors) {
        Fliplet.Analytics.trackEvent('form', 'submit');

        $formHtml.fadeOut(function () {
          var fields = {};
          var files = {};
          var formData;

          $form.find('[name]').each(function () {
            var $el = $(this);
            var name = $el.attr('name');
            var type = $el.attr('type');

            if (type === 'radio') {
              if ($el.is(':checked')) {
                fields[name] = $el.val();
              }
            } else if (type === 'checkbox') {
              if (!fields[name]) {
                fields[name] = [];
              }

              if ($el.is(':checked')) {
                fields[name].push($el.val());
              }
            } else if (type === 'file') {
              files[name] = $el[0].files;
            } else {
              fields[name] = $el.val();
            }
          });

          // Transform to FormData if files were posted
          var fileNames = Object.keys(files);
          if (fileNames.length) {
            if (!Fliplet.Navigator.isOnline()) {
              return alert('You must be connected to submit this form');
            }

            formData = new FormData();

            fileNames.forEach(function (fileName) {
              var fieldFiles = files[fileName];
              var file;

              for (var i = 0; i < fieldFiles.length; i++) {
                file = fieldFiles.item(i);
                formData.append(fileName, file);
              }
            });

            Object.keys(fields).forEach(function (fieldName) {
              var value = fields[fieldName];
              if (Array.isArray(value)) {
                value.forEach(function (val) {
                  formData.append(fieldName + '[]', val);
                });
              } else {
                formData.append(fieldName, value);
              }
            });
          }

          formData = formData || fields;

          if (typeof formInstance.mapData === 'function') {
            formData = formInstance.mapData(formData);
          }

          var options = {};
          if (data.folderId) {
            options.folderId = data.folderId;
          }

          getConnection().then(function (connection) {
            if (typeof formInstance.submit === 'function') {
              return formInstance.submit(formData);
            }

            if (dataSourceEntryId) {
              return connection.update(dataSourceEntryId, formData, options);
            }

            return connection.insert(formData, options);
          }).then(function onSaved() {
            $formResult.fadeIn();
            resetForm();
          }, function onError(error) {
            console.error(error);
          });
        });
      } else {
        if (Fliplet.Env.get('platform') === "native") {
          navigator.notification.alert(
            "You need to fill in the required fields",
            function(){},
            'Required fields',
            'OK'
          );
        } else {
          alert("Required fields\nYou need to fill in the required fields");
        }
      }
    });

    $form.on('click', '[data-start]', function (event) {
      event.preventDefault();
      $formResult.fadeOut(function () {
        $formHtml.fadeIn();
      });
    });

    $form.on('reset', function onResetForm() {
      Fliplet.Analytics.trackEvent('form', 'reset');
    });

    formInstance.toggleEditMode = function (enabled) {
      editModeEnabled = !!enabled;
      resetForm();
    };

    function resetForm() {
      $form.trigger('reset');
      bindEditMode();
    }

    function fillForm(data) {
      Object.keys(data).forEach(function (key) {
        var value = data[key];
        var $input = $form.find('[name="' + key + '"], [name="' + key + '[]"]');
        var type = $input.attr('type');

        if (Array.isArray(value)) {
          value.forEach(function (val) {
            $input.filter('[value="' + val + '"]')
              .prop('checked', true)
              .prop('selected', true);
          });
        } else {
          if (!$input.length || type === 'file') {
            $input = $('<input class="fl-data" type="hidden" name="' + key + '" />');
            $input.val(value);
            $form.prepend($input);
          } else {
            if (type === 'radio') {
              $input.filter('[value="' + value + '"]').prop('checked', true);
            } else {
              $input.val(value);
            }
          }
        }
      });
    }

    function bindEditMode() {
      if (editModeEnabled && Fliplet.Navigate.query.dataSourceId === data.dataSourceId) {
        getConnection().then(function (connection) {
          dataSourceEntryId = parseInt(Fliplet.Navigate.query.dataSourceEntryId);
          return connection.findById(dataSourceEntryId);
        }).then(function (dataSourceEntry) {
          if (!dataSourceEntry) {
            return;
          }

          $form.find('input.fl-data[type="hidden"]').remove();

          fillForm(dataSourceEntry.data);

          var $submit = $form.find('[type="submit"]');
          var editLabel = $submit.data('edit-label');
          if (editLabel) {
            $submit.html(editLabel); // button
            $submit.val(editLabel);  // input
          }
        }, function () {
          // Entry not found, or user has got no access to it
          dataSourceEntryId = null;
        });
      }
    }

    Fliplet.Navigator.onReady().then(function () {
      if (globalEditModeEnabled) {
        bindEditMode();
      }
    });
  });

  Fliplet.Widget.register('com.fliplet.form', function () {
    return {
      disableAutoBindMode: function () {
        globalEditModeEnabled = false;
      },
      forms: function (uuid) {
        if (uuid) {
          return forms[uuid];
        }

        return Object.keys(forms).map(function (uuid) {
          return forms[uuid];
        });
      }
    };
  });

})();
