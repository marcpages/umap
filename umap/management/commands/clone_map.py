import sys

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import translation

from umap.models import Map


class Command(BaseCommand):
    help = (
        "Clone a map. "
        "Eg.: python manage.py clone_map 1234"
    )

    def add_arguments(self, parser):
        parser.add_argument("pk", help="PK of the map to retrieve.")
        parser.add_argument("name", help="Name of the new map.")
        parser.add_argument("slug", help="Slug of the new map.")

    def abort(self, msg):
        self.stderr.write(msg)
        sys.exit(1)

    def handle(self, *args, **options):
        pk = options["pk"]
        name = options["name"]
        slug = options["slug"]
        try:
            map_ = Map.objects.get(pk=pk)
            new = map_.clone(name=name, slug=slug)
        except Map.DoesNotExist:
            self.abort("Map with pk {} not found".format(pk))
        print(new.pk)
