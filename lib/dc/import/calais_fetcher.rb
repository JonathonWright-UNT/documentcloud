module DC
  module Import

    class CalaisFetcher

      # Content limit that Calais sets on number of characters. Minus some
      # safety padding because Calais was still throwing errors. Perhaps they're
      # counting bytes?
      MAX_TEXT_SIZE = 99500

      # Fetch the RDF from OpenCalais, splitting it into chunks small enough
      # for Calais to swallow.
      def fetch_rdf(text)
        text   = clean_pseudo_html(text)
        text   = text.mb_chars
        chunks = split_text(text)
        chunks.map {|chunk| fetch_rdf_from_calais(chunk) }
      end

      # Divide the text into chunks that pass the size limit.
      # Unused until we have a real RDF merge strategy.
      def split_text(text)
        max = MAX_TEXT_SIZE
        (0..((text.length-1) / max)).map {|i| text[i * max, max]}
      end

      # Calais complains if the content contains HTML tags...
      def clean_pseudo_html(text)
        text.gsub(/<\/?[^>]*>/, "")
      end

      def fetch_rdf_from_calais(text)
        client = Calais::Client.new(
          :content                        => text,
          :content_type                   => :text,
          :license_id                     => SECRETS['calais_license'],
          :allow_distribution             => false,
          :allow_search                   => false,
          :submitter                      => "DocumentCloud (#{RAILS_ENV})",
          :omit_outputting_original_text  => true
        )
        client.enlighten
      end

    end

  end
end