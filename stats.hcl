job "witchtrade-stats" {
  datacenters = ["dc1"]
  type        = "service"

  group "witchtrade" {
    count = 1

    service {
      name = "witchtrade-stats"
      provider = "nomad"
    }

    task "server" {
      driver = "docker"

      resources {
        cpu = 300
        memory = 300
      }

      template {
        data = <<EOH
          {{ range nomadService "witchtrade-db" }}
            DATABASEHOST="{{ .Address }}"
            STATS_DATABASEHOST="{{ .Address }}"
          {{ end }}
        EOH
        destination = "/env.env"
        env = true
      }

      env {
        DATABASEUSER = "USER"
        DATABASEPORT = "5432"
        DATABASEPW = "PASSWORD"
        STEAMMASTERSERVER = "hl2master.steampowered.com:27011"
        WITCHITAPPID = "559650"
      }

      config {
        image = "ghcr.io/witchtrade/witchitsrvstats"
      }
    }
  }
}